"""
ml/rules/checks/personal.py
----------------------------
Rules checking whether the title uses the applicant's own name.

RULES IMPLEMENTED
    R-PER-01  Owner/Publisher personal name as title  (Guideline 6)

PORTED FROM FRONTEND: Not present in rulesEngine.ts — this rule was not
    implemented on the frontend. It requires applicant data from the form.

IMPORTANT DESIGN NOTE
---------------------
This rule requires ctx.applicant_name to be set by the caller.
If it is None (the API did not receive an applicant name), the rule
passes with requires_human_confirmation=True rather than auto-failing,
because we cannot check what we were not given.
"""

from __future__ import annotations

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome


def _name_tokens(name: str) -> set[str]:
    """Split a full name into lowercase tokens, ignoring short particles."""
    return {t.lower() for t in name.split() if len(t) > 2}


@rule("R-PER-01")
def check_personal_name(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 6 — Titles denoting the name of an individual should not
    be the names of the owner or publisher of the proposed periodical.

    HOW THE CHECK WORKS
    -------------------
    1. If applicant_name is not provided → requires_human_confirmation=True.
    2. Tokenise both the title and the applicant's name.
    3. If ≥ 2 name tokens appear in the title tokens, flag it.
       (Requiring 2 tokens prevents false positives on common first names
       like "Ram" which appear in many legitimate titles.)

    REFERENCE EXAMPLES from Guideline 6
    ------------------------------------
    FAIL: "Rajan Times" where applicant is "Rajan Sharma"
    PASS: "National Times" where applicant is "Rajan Sharma"
    """
    if not ctx.applicant_name:
        return RuleOutcome(
            passed=True,
            message=(
                "Applicant name not provided — personal name check skipped. "
                "PRGI officer should verify manually."
            ),
            requires_human_confirmation=True,
        )

    title_tokens = set(ctx.tokens)
    name_parts = _name_tokens(ctx.applicant_name)

    overlap = title_tokens & name_parts

    if len(overlap) >= 2 or (len(overlap) == 1 and len(ctx.tokens) <= 2):
        matched = ", ".join(sorted(overlap))
        return RuleOutcome(
            passed=False,
            message=(
                f"Title shares the name token(s) '{matched}' with the applicant "
                f"'{ctx.applicant_name}'. Titles must not be the owner or publisher's "
                "own name (PRGI Guideline 6)."
            ),
            trigger_phrase=matched,
        )
    return RuleOutcome(passed=True)
