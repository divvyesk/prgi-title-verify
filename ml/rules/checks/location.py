"""
ml/rules/checks/location.py
----------------------------
Rules checking for misleading foreign location associations.

RULES IMPLEMENTED
    R-LOC-01  Foreign country/city association  (Guideline 13)
"""

from __future__ import annotations
from pathlib import Path

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

_WL_DIR = Path(__file__).parent.parent.parent.parent / "rules" / "wordlists"

_FOREIGN_LOCATIONS = [
    line.strip().lower()
    for line in (_WL_DIR / "foreign_locations.txt").read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.startswith("#")
]


@rule("R-LOC-01")
def check_foreign_location(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 13 — Titles suggesting association with a foreign country,
    city, or place which does not correspond to the State or place of
    publication shall not be registered.

    OVER-FIRING GUARD
    -----------------
    This check flags the title and sets requires_human_confirmation=True because
    the system cannot know the applicant's place of publication at rule-check time
    (that is a database lookup). The PRGI officer must verify whether the
    location in the title matches the publication state.
    """
    for location in _FOREIGN_LOCATIONS:
        if location in ctx.normalized:
            return RuleOutcome(
                passed=False,
                message=(
                    f"Title contains the foreign location '{location}'. "
                    "A PRGI officer must verify whether this corresponds to the "
                    "place of publication (PRGI Guideline 13)."
                ),
                trigger_phrase=location,
                requires_human_confirmation=True,
            )
    return RuleOutcome(passed=True)
