"""
ml/rules/engine.py
------------------
The central entry point for the deterministic rule-check stage (Stage 4 of the
PRGI TitleGuard pipeline).

PUBLIC API
----------
    check_all(title, ctx) → list[RuleViolation]

WHAT IT DOES
------------
1. Imports every checks/ sub-module so their @rule decorators fire and
   populate the REGISTRY.  This is why the import lines at the bottom matter.
2. Iterates REGISTRY in insertion order.
3. Calls each rule function with (title, ctx).
4. Converts the returned RuleOutcome into a RuleViolation dataclass.
5. If a rule function raises any exception, catches it, logs it, and records
   a RuleViolation with severity="ERROR" so the caller knows evaluation failed
   for that specific rule.  One broken rule never fails the whole request.

TECH: why not import * ?
-------------------------
We import each checks/ module explicitly so that:
  a. The import order is deterministic (alphabetical here).
  b. A future developer knows exactly which check files exist by reading this
     module — no magic discovery.

TECH: RuleViolation
--------------------
Instead of returning raw RuleOutcome objects, we wrap them in RuleViolation —
a richer dataclass that also carries the metadata attached to the function by
the @rule decorator (rule_id, rule_name, severity, source_clause, etc.).
This is the object that contracts/contracts.py will eventually serialise and
send to the frontend.

TECH: logging
--------------
We use Python's standard logging module instead of print().  The caller
(the FastAPI backend) configures the log level.  In tests you can configure
logging.basicConfig(level=logging.DEBUG) to see all rule traces.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from ml.rules.registry import REGISTRY
from ml.rules.types import RuleContext, RuleOutcome

# Import every checks module so their @rule decorators register the functions.
# ORDER IS ALPHABETICAL — keep it that way to avoid accidental coupling.
import ml.rules.checks.commercial   # noqa: F401  registers R-COM-01/02/03
import ml.rules.checks.decency      # noqa: F401  registers R-DEC-01/02/03/04
import ml.rules.checks.duplicates   # noqa: F401  registers R-DUP-07
import ml.rules.checks.emblems      # noqa: F401  registers R-EMB-01/02/03
import ml.rules.checks.generic      # noqa: F401  registers R-GEN-01/02/03/04/05
import ml.rules.checks.government   # noqa: F401  registers R-GOV-02..09
import ml.rules.checks.length       # noqa: F401  registers R-LEN-01/02/03, R-NUM-01
import ml.rules.checks.location     # noqa: F401  registers R-LOC-01
import ml.rules.checks.personal     # noqa: F401  registers R-PER-01
import ml.rules.checks.religious    # noqa: F401  registers R-REL-01
import ml.rules.checks.semantic     # noqa: F401  registers R-SEM-01 (stub)
import ml.rules.checks.symbols      # noqa: F401  registers R-SYM-01/02
import ml.rules.checks.url          # noqa: F401  registers R-URL-01/02

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# RuleViolation — the output shape of the engine
# ---------------------------------------------------------------------------
@dataclass
class RuleViolation:
    """
    A single rule's verdict, enriched with the legal metadata from rules.json.

    Fields
    ------
    rule_id          : e.g. "R-SYM-01"
    rule_name        : Human-readable name from rules.json.
    severity         : "CRITICAL" | "WARNING" | "INFO" | "ERROR"
                       ERROR is only used when a rule function crashed.
    section          : Guideline section reference, e.g. "Guideline 7".
    description      : One-sentence description from rules.json.
    source_clause    : Verbatim text from the PRGI document, or an explanation
                       of why it could not be verified.
    source_clause_verified : True if the clause was found word-for-word.
    passed           : True → title satisfies the rule.
    message          : Human-readable explanation of the outcome.
    trigger_phrase   : The substring of the title that caused the failure.
    requires_human_confirmation : When True do NOT auto-reject — escalate.
    evaluation_error : Non-None only when the rule function threw an exception.
                       Contains the exception message for diagnostics.
    """
    rule_id: str
    rule_name: str
    severity: str
    section: str
    description: str
    source_clause: str
    source_clause_verified: bool
    passed: bool
    message: str = ""
    trigger_phrase: str | None = None
    requires_human_confirmation: bool = False
    evaluation_error: str | None = None


# ---------------------------------------------------------------------------
# check_all — the only function callers need to call
# ---------------------------------------------------------------------------
def check_all(title: str, ctx: RuleContext) -> list[RuleViolation]:
    """
    Run every registered rule against the given title.

    Parameters
    ----------
    title : The raw (or lightly cleaned) title string submitted by the applicant.
    ctx   : A RuleContext built by the normaliser before this stage is called.

    Returns
    -------
    A list of RuleViolation objects, one per registered rule.
    Rules that passed have .passed=True.
    Rules that failed have .passed=False and a non-empty .message.
    The list is ordered by rule registration order (insertion order in REGISTRY).

    Guarantees
    ----------
    - Never raises.  Every exception from a rule function is caught and turned
      into a RuleViolation with severity="ERROR" and evaluation_error set.
    - Returns an empty list if REGISTRY is empty (harmless, will log a warning).
    """
    if not REGISTRY:
        logger.warning("check_all called but REGISTRY is empty — no checks/ modules imported?")
        return []

    violations: list[RuleViolation] = []

    for rule_id, fn in REGISTRY.items():
        try:
            outcome: RuleOutcome = fn(title, ctx)
        except Exception as exc:  # pylint: disable=broad-except
            # One broken rule must never fail the entire request.
            logger.exception("Rule %s raised an unexpected exception", rule_id)
            violations.append(RuleViolation(
                rule_id=rule_id,
                rule_name=getattr(fn, "rule_name", rule_id),
                severity="ERROR",
                section=getattr(fn, "section", ""),
                description=getattr(fn, "description", ""),
                source_clause=getattr(fn, "source_clause", ""),
                source_clause_verified=getattr(fn, "source_clause_verified", False),
                passed=False,
                message=f"Rule could not be evaluated due to an internal error.",
                evaluation_error=str(exc),
            ))
            continue

        violations.append(RuleViolation(
            rule_id=rule_id,
            rule_name=fn.rule_name,
            severity=fn.severity,
            section=fn.section,
            description=fn.description,
            source_clause=fn.source_clause,
            source_clause_verified=fn.source_clause_verified,
            passed=outcome.passed,
            message=outcome.message,
            trigger_phrase=outcome.trigger_phrase,
            requires_human_confirmation=outcome.requires_human_confirmation,
        ))

    failed = [v for v in violations if not v.passed]
    logger.debug(
        "check_all: %d rules evaluated, %d failed for title '%s'",
        len(violations), len(failed), title[:40],
    )
    return violations


# ---------------------------------------------------------------------------
# check — public alias expected by backend/app/services/pipeline.py
# ---------------------------------------------------------------------------
def check(title: str) -> list[RuleViolation]:
    """
    Thin wrapper around check_all() with a default empty RuleContext.

    backend/app/services/pipeline.py calls:
        from ml.rules.engine import check
        check(title) -> list[RuleViolation]

    This alias keeps pipeline.py working without needing a RuleContext
    at the call site.  All rule violations are returned (both passed=True
    and passed=False) so the pipeline can decide what to surface.
    """
    import re
    normalized = re.sub(r"\s+", " ", title.strip().lower())
    tokens = normalized.split()
    return check_all(title, RuleContext(normalized=normalized, tokens=tokens))
