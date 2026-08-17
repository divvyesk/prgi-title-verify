"""
ml/rules/checks/religious.py
-----------------------------
Rules checking for communal sensitivity (R-REL-01).

RULES IMPLEMENTED
    R-REL-01  Communal sensitivity / communal disharmony  (unverified)

NOTE: R-REL-01 is related to but distinct from R-DEC-01 (religious negative
connotations). R-DEC-01 covers Guideline 3 directly. R-REL-01 covers a broader
concern about communal disharmony which is not explicitly stated in the
Guidelines document but is a reasonable extension of Guideline 3 and 10.
source_clause_verified=False.

OVER-FIRING GUARD (CRITICAL)
    This rule ONLY fires for explicit anti-community phrases, never for
    neutral mentions of community names. "Hindu Times", "Muslim Mirror" etc.
    are legitimate titles and must NOT be flagged.
    Only phrases explicitly framing one community against another trigger this rule.
"""

from __future__ import annotations

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

# Only the most explicit communal disharmony phrases.
# Neutral community names (Hindu, Muslim, Sikh, Christian, etc.) are NOT in this list.
_COMMUNAL_PHRASES = {
    "anti-hindu", "anti-muslim", "anti-sikh", "anti-christian",
    "kill hindus", "kill muslims", "hindu vs muslim", "muslim vs hindu",
    "communal riot", "religious war",
}


@rule("R-REL-01")
def check_communal_sensitivity(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    Titles promoting communal disharmony are not allowed.

    NOTE: source_clause_verified=False — Guideline 3 covers religious sentiment
    broadly, but "communal disharmony" phrasing is not verbatim in the
    Guidelines document in this repo.

    CONSTRAINT: This rule MUST NOT flag neutral mentions of community names.
    It ONLY fires for explicit anti-community phrases.

    OVER-FIRING GUARD: requires_human_confirmation=True on all violations,
    because determining communal tone requires human judgment.
    """
    for phrase in _COMMUNAL_PHRASES:
        if phrase in ctx.normalized:
            return RuleOutcome(
                passed=False,
                message=(
                    f"Title contains '{phrase}', which may promote communal "
                    "disharmony. This requires human review."
                ),
                trigger_phrase=phrase,
                requires_human_confirmation=True,
            )
    return RuleOutcome(passed=True)
