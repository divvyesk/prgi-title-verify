"""
ml/rules/registry.py
--------------------
Decorator-based registry that binds every rule *function* to its legal metadata
from rules/rules.json at import time, so the code and the citation can never
drift apart.

HOW IT WORKS — step by step
============================

1.  At module load, _load_rules_json() reads rules/rules.json once and builds a
    dict keyed by rule_id.  This happens exactly once per Python process.

2.  The @rule("R-XXX-NN") decorator:
        a. Looks up the rule_id in that dict.
        b. Attaches the legal metadata (name, severity, source_clause, etc.)
           directly to the function object as attributes.
        c. Stores the function in REGISTRY under its rule_id.
        d. Returns the function unchanged, so it can still be called normally.

3.  engine.py iterates REGISTRY and calls every function, then uses the
    metadata attached to the function to build a RuleViolation — so the
    citation text is ALWAYS sourced from rules.json, never typed by hand in
    Python code.

TECH: functools.wraps
---------------------
When you wrap a function with a decorator, Python would normally replace
__name__ and __doc__ with those of the wrapper.  functools.wraps(fn) copies
the originals back, so tracebacks and repr() show the real function name.

TECH: Callable type alias
--------------------------
RuleFn is a type alias meaning "a function that takes (str, RuleContext) and
returns RuleOutcome".  It is only used for type annotations — it makes IDEs
show autocomplete and catch mistakes before runtime.
"""

from __future__ import annotations

import json
import logging
from functools import wraps
from pathlib import Path
from typing import Callable

from ml.rules.types import RuleContext, RuleOutcome

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Type alias — a rule function is always (title: str, ctx: RuleContext) → RuleOutcome
# ---------------------------------------------------------------------------
RuleFn = Callable[[str, RuleContext], RuleOutcome]

# ---------------------------------------------------------------------------
# The global registry: rule_id → decorated function (with metadata attached)
# ---------------------------------------------------------------------------
REGISTRY: dict[str, RuleFn] = {}

# ---------------------------------------------------------------------------
# Internal: load rules.json once at import time
# ---------------------------------------------------------------------------
_RULES_JSON_PATH = Path(__file__).parent.parent.parent / "data" / "rules" / "rules.json"
_RULE_META: dict[str, dict] = {}


def _load_rules_json() -> None:
    """Read rules/rules.json and populate _RULE_META.  Called once at module load."""
    global _RULE_META
    if not _RULES_JSON_PATH.exists():
        logger.error("rules/rules.json not found at %s — registry will have no metadata", _RULES_JSON_PATH)
        return
    with _RULES_JSON_PATH.open(encoding="utf-8") as fh:
        rules_list: list[dict] = json.load(fh)
    _RULE_META = {r["rule_id"]: r for r in rules_list}
    logger.debug("Loaded %d rule definitions from rules.json", len(_RULE_META))


_load_rules_json()  # ← runs once when this module is first imported


# ---------------------------------------------------------------------------
# The @rule decorator
# ---------------------------------------------------------------------------
def rule(rule_id: str):
    """
    Class-free decorator factory.

    Usage
    -----
        @rule("R-LEN-01")
        def check_length(title: str, ctx: RuleContext) -> RuleOutcome:
            ...

    What it does
    ------------
    1. Looks up rule_id in _RULE_META (loaded from rules.json).
    2. Attaches legal metadata as attributes on the function:
           fn.rule_id, fn.rule_name, fn.severity, fn.section,
           fn.description, fn.source_clause, fn.source_clause_verified
    3. Registers the function in REGISTRY.
    4. Returns fn unchanged (so it is still callable directly in tests).

    Raises
    ------
    KeyError if rule_id is not found in rules.json.  This is intentional —
    a rule function that references a non-existent rule_id is a bug that
    should be caught at startup, not silently ignored.
    """
    def decorator(fn: RuleFn) -> RuleFn:
        if rule_id not in _RULE_META:
            raise KeyError(
                f"@rule('{rule_id}') references a rule_id that does not exist "
                f"in rules/rules.json.  Add the entry to rules.json first."
            )

        meta = _RULE_META[rule_id]

        @wraps(fn)
        def wrapper(title: str, ctx: RuleContext) -> RuleOutcome:
            return fn(title, ctx)

        # Attach legal metadata directly to the wrapper function object.
        # engine.py reads these attributes to build RuleViolation objects.
        wrapper.rule_id                = rule_id
        wrapper.rule_name              = meta["name"]
        wrapper.severity               = meta["severity"]
        wrapper.section                = meta.get("section", "")
        wrapper.description            = meta["description"]
        wrapper.source_clause          = meta["source_clause"]
        wrapper.source_clause_verified = meta["source_clause_verified"]

        REGISTRY[rule_id] = wrapper
        logger.debug("Registered rule %s (%s)", rule_id, meta["name"])
        return wrapper

    return decorator
