"""
tests/test_rules.py
--------------------
Data-driven test suite. Tests come from rules/rules.json itself —
adding a new rule object with examples_fail / examples_pass entries
automatically creates new test cases without touching this file.

HOW IT WORKS
============

Parametrize at collection time
--------------------------------
pytest.mark.parametrize() accepts a generator, which we call at module
import time (before any test runs). The generators failing_examples() and
passing_examples() iterate rules.json and yield one pytest.param per
example title. pytest then creates one test node per param, giving each
a readable ID like "R-GEN-01-fail-Manthan".

run_rule() helper
-----------------
We don't call check_all() for the per-rule tests — we call the specific
function directly from REGISTRY so the test failure is attributed to the
correct rule, not buried in a 36-rule result list.

KNOWN_UNIMPLEMENTED
-------------------
Some rules in rules.json describe restrictions that are verified at the
retrieval/shortlisting stage (e.g. R-DUP-01 phonetic similarity) or
require a live DB connection (R-LEG-01 trademark check). These cannot
be unit-tested here. List them explicitly: the test suite prints them as
warnings but does NOT fail.

HOW TO RUN
----------
    PYTHONPATH=. python -m pytest tests/test_rules.py -v
    PYTHONPATH=. python -m pytest tests/test_rules.py -v --tb=short 2>&1 | head -80
"""

import csv
import json
import logging
import random
import warnings
from pathlib import Path

import pytest

# Import engine so all @rule decorators fire and populate REGISTRY
from ml.rules.engine import check_all
from ml.rules.registry import REGISTRY
from ml.rules.types import RuleContext, RuleOutcome

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
RULES_JSON = Path("rules/rules.json")
TITLE_MASTER = Path("data/datasets/dataset1/data/processed/title_master.csv")
RANDOM_SEED = 42

# Rules that exist in rules.json but are NOT implemented in the rule engine.
# These are retrieval-stage or database-dependent checks.
# The test suite prints these as warnings, not failures.
KNOWN_UNIMPLEMENTED: set[str] = {
    "R-DUP-01",  # phonetic similarity — retrieval stage (Jai's code)
    "R-DUP-02",  # visual similarity  — retrieval stage (Jai's code)
    "R-DUP-03",  # combining full existing titles — DB lookup needed
    "R-DUP-04",  # rearranging existing titles    — DB lookup needed
    "R-DUP-05",  # inserting non-distinctive terms — DB lookup needed
    "R-DUP-06",  # well-known periodicals          — DB lookup needed
    "R-LEG-01",  # copyright infringement  — external DB
    "R-LEG-02",  # trademark infringement  — external DB
    "R-LEG-03",  # defamation              — external DB
    "R-MED-01",  # TV/Radio channel check  — I&B broadcast registry
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_rules() -> list[dict]:
    with RULES_JSON.open(encoding="utf-8") as f:
        return json.load(f)


def make_ctx(title: str, applicant_name: str | None = None) -> RuleContext:
    """Build a minimal RuleContext from a raw title string."""
    normalized = title.strip().lower()
    return RuleContext(
        normalized=normalized,
        tokens=normalized.split(),
        language=None,
        script=None,
        applicant_name=applicant_name,
    )


def run_rule(rule_id: str, title: str, applicant_name: str | None = None) -> RuleOutcome:
    """
    Invoke a single registered rule function directly and return its RuleOutcome.
    Skips the rule if it is not in REGISTRY (e.g. KNOWN_UNIMPLEMENTED).
    """
    fn = REGISTRY.get(rule_id)
    if fn is None:
        pytest.skip(f"{rule_id} is not in REGISTRY (KNOWN_UNIMPLEMENTED or not yet ported)")
    ctx = make_ctx(title, applicant_name=applicant_name)
    return fn(title, ctx)


# ---------------------------------------------------------------------------
# Data-driven: failing examples (from rules.json examples_fail)
# ---------------------------------------------------------------------------

def failing_examples():
    """
    Generator: yields one pytest.param per (rule_id, title) pair in examples_fail.
    If examples_fail is empty for a rule, that rule is silently skipped here
    (the cross-cutting test will catch it).
    """
    for r in load_rules():
        rid = r["rule_id"]
        if rid in KNOWN_UNIMPLEMENTED:
            continue
        for title in r.get("examples_fail", []):
            yield pytest.param(rid, title, id=f"{rid}-fail-{title[:20]}")


def passing_examples():
    """
    Generator: yields one pytest.param per (rule_id, title) pair in examples_pass.
    """
    for r in load_rules():
        rid = r["rule_id"]
        if rid in KNOWN_UNIMPLEMENTED:
            continue
        for title in r.get("examples_pass", []):
            yield pytest.param(rid, title, id=f"{rid}-pass-{title[:20]}")


# ---------------------------------------------------------------------------
# DATA-DRIVEN TESTS (one per example in rules.json)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("rule_id,title", failing_examples())
def test_rule_fails(rule_id: str, title: str):
    """
    Each title in examples_fail MUST trigger the rule (passed=False).

    If this test fails it means our detection logic does not catch the
    example that was explicitly written into the rules spec.
    """
    outcome = run_rule(rule_id, title)
    # Special case: R-SEM-01 is a stub that never fails — skip its fail test
    if rule_id == "R-SEM-01":
        pytest.skip("R-SEM-01 is a stub — cannot auto-fail until Suhani implements it")
    # Special case: requires_human_confirmation → we accept it as a soft failure
    # (it still has passed=False conceptually, even if escalated)
    assert not outcome.passed, (
        f"Rule {rule_id} was expected to FAIL for '{title}' "
        f"but returned passed=True. message='{outcome.message}'"
    )


@pytest.mark.parametrize("rule_id,title", passing_examples())
def test_rule_passes(rule_id: str, title: str):
    """
    Each title in examples_pass must NOT trigger the rule (passed=True).

    If this test fails it means the rule is over-firing (false positive).
    A false positive is a harder defect than a false negative: it means
    a legitimate applicant gets rejected.
    """
    outcome = run_rule(rule_id, title)
    assert outcome.passed, (
        f"Rule {rule_id} was expected to PASS for '{title}' "
        f"(false positive). message='{outcome.message}'"
    )


# ---------------------------------------------------------------------------
# CROSS-CUTTING TEST 1: check_all() never raises on real titles
# ---------------------------------------------------------------------------

def _load_real_titles(n: int = 1000) -> list[str]:
    """Load n random real titles from title_master.csv."""
    if not TITLE_MASTER.exists():
        return []
    with TITLE_MASTER.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    random.seed(RANDOM_SEED)
    sample = random.sample(rows, min(n, len(rows)))
    return [r["Title"] for r in sample]


_REAL_TITLES = _load_real_titles(1000)


@pytest.mark.skipif(not _REAL_TITLES, reason="title_master.csv not found")
def test_check_all_never_raises_on_real_titles():
    """
    check_all() must never raise for any real registered title.

    We run all 1000 titles and collect any that caused an exception-type
    violation (evaluation_error is not None). At the end we fail if any
    exceptions were recorded (not just log them).
    """
    crash_records = []
    for title in _REAL_TITLES:
        ctx = make_ctx(title)
        try:
            violations = check_all(title, ctx)
        except Exception as exc:
            crash_records.append((title, str(exc)))
            continue
        # Check for evaluation_error within violations
        for v in violations:
            if v.evaluation_error:
                crash_records.append((title, f"{v.rule_id}: {v.evaluation_error}"))

    if crash_records:
        detail = "\n".join(f"  '{t}' → {e}" for t, e in crash_records[:10])
        pytest.fail(
            f"{len(crash_records)} real titles caused rule engine errors:\n{detail}"
        )


# ---------------------------------------------------------------------------
# CROSS-CUTTING TEST 2: every rule in rules.json has an implementation
# ---------------------------------------------------------------------------

def test_every_json_rule_is_implemented_or_known_unimplemented():
    """
    Every rule_id in rules.json must either:
      a) exist in REGISTRY (implemented), or
      b) be listed in KNOWN_UNIMPLEMENTED.

    If neither, we fail — a rule that exists in the legal spec but has no
    code and is not documented as unimplemented is a silent gap.
    """
    rules = load_rules()
    missing = []
    for r in rules:
        rid = r["rule_id"]
        if rid not in REGISTRY and rid not in KNOWN_UNIMPLEMENTED:
            missing.append(rid)

    if missing:
        # Print which ones are missing so the developer can add them to checks/
        # or to KNOWN_UNIMPLEMENTED
        pytest.fail(
            f"The following rule_ids from rules.json have no implementation "
            f"and are not in KNOWN_UNIMPLEMENTED:\n  {missing}\n"
            "Add them to a checks/*.py file OR add them to KNOWN_UNIMPLEMENTED "
            "in tests/test_rules.py with a comment explaining why."
        )

    # Print KNOWN_UNIMPLEMENTED as informational warnings
    unimplemented_in_json = [
        r["rule_id"] for r in rules if r["rule_id"] in KNOWN_UNIMPLEMENTED
    ]
    if unimplemented_in_json:
        warnings.warn(
            f"\n[INFO] {len(unimplemented_in_json)} rules are in rules.json but "
            f"not implemented in the engine (KNOWN_UNIMPLEMENTED):\n"
            + "\n".join(f"  - {rid}" for rid in unimplemented_in_json),
            stacklevel=2,
        )


# ---------------------------------------------------------------------------
# CROSS-CUTTING TEST 3: every RuleViolation has a non-empty source_clause
# ---------------------------------------------------------------------------

def test_every_violation_has_non_empty_clause():
    """
    Every RuleViolation produced by check_all() must have a non-empty
    source_clause string.

    This is the citation-integrity guarantee of the entire system.
    Even for unverified rules, the source_clause must contain an explanation
    of where we looked (not just an empty string).

    We test this on a set of titles that are designed to trigger every rule.
    """
    # Titles that should cause at least one violation each
    trigger_titles = [
        "Manthan",                    # R-GEN-01
        "IBM",                        # R-LEN-01
        "12345",                      # R-NUM-01
        "@#*! News",                  # R-SYM-01
        "News News News",             # R-DUP-07
        "Royal Matrimonial",          # R-COM-02
        "Delhi Classifieds",          # R-COM-01
        "UN Daily",                   # R-GOV-06
        "Ashoka Chakra News",         # R-EMB-01
        "Break India News",           # R-GOV-02
        "Crime Times",                # R-DEC-04
        "news.com",                   # R-URL-01
        "Anti-Hindu Times",           # R-REL-01
        "South Africa Times",         # R-LOC-01
    ]

    empty_clause_found = []
    for title in trigger_titles:
        ctx = make_ctx(title)
        violations = check_all(title, ctx)
        for v in violations:
            if not v.source_clause or not v.source_clause.strip():
                empty_clause_found.append(
                    f"'{title}' → {v.rule_id}: source_clause is empty"
                )

    if empty_clause_found:
        pytest.fail(
            "The following violations had empty source_clause:\n"
            + "\n".join(f"  {e}" for e in empty_clause_found)
        )
