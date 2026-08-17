"""
ml/rules/checks/government.py
------------------------------
Rules checking for misleading government/institutional association.

RULES IMPLEMENTED
    R-GOV-02  Sovereignty/integrity of India keywords  (Guideline 10)
    R-GOV-03  Security of the State keywords           (Guideline 10)
    R-GOV-04  Incite unrest / disorder keywords        (Guideline 10)
    R-GOV-05  Government organizations/departments     (Guideline 12)
    R-GOV-06  International organizations (UN, WHO…)   (Guideline 12)
    R-GOV-07  Public welfare scheme names              (Guideline 12)
    R-GOV-08  National leaders                         (Guideline 14)
    R-GOV-09  Heads of Government / govt functionaries (Guideline 14)

PORTED FROM FRONTEND: rulesEngine.ts Rule-2.1a
    - Citation in frontend: 'Emblems and Names (Prevention of Improper Use)
      Act & PRGI Clause 2.1(a)'
    - STATUS: PARTIALLY VERIFIED — The Emblems Act reference is real legislation,
      but "PRGI Clause 2.1(a)" does not appear in the Guidelines document.
      The actual PRGI clause is Guideline 11 (for Emblems) and Guideline 12
      (for government org names).
    - ACTION NEEDED: Frontend Rule-2.1a clause should split into:
        Guideline 11 → national symbols / Emblems Act
        Guideline 12 → government department / international org names

OVER-FIRING GUARD (CRITICAL)
    Words like "police" or "army" appear in thousands of legitimate titles
    ("Police Beat Review", "Army Veterans Today"). We require that the matched
    government word is the DOMINANT term — meaning it is one of the first two
    tokens OR the title has ≤ 3 tokens total.  Titles with 4+ tokens where
    the government word appears deep in the middle are escalated to WARNING,
    not CRITICAL.
"""

from __future__ import annotations
import re
from pathlib import Path

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

_WL_DIR = Path(__file__).parent.parent.parent.parent / "rules" / "wordlists"


def _load_phrases(filename: str) -> list[str]:
    path = _WL_DIR / filename
    if not path.exists():
        return []
    return [
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]


_GOVT_WORDS = _load_phrases("government.txt")
_LEADER_WORDS = _load_phrases("national_leaders.txt")

# International orgs — extracted from Guideline 12 verbatim examples
_INTL_ORGS = {"united nations", "un", "unicef", "unesco", "who", "ilo", "imf", "wto"}

# Public welfare schemes — partial list, would grow from official PRGI data
_WELFARE_SCHEMES = {
    "pm kisan", "pradhan mantri", "mukhyamantri", "ayushman bharat",
    "swachh bharat", "beti bachao", "jan dhan", "ujjwala",
}

# Words specifically about sovereignty/security/unrest (Guideline 10)
_SOVEREIGNTY_WORDS = {
    "break india", "destroy india", "traitor", "anti-national", "antinational",
}
_UNREST_WORDS = {"riot", "insurrection", "rebellion", "jihad", "sedition"}


def _find_phrase(normalized: str, phrases: list[str] | set[str]) -> str | None:
    for ph in phrases:
        if " " in ph:
            if ph in normalized:
                return ph
        elif re.search(rf"\b{re.escape(ph)}\b", normalized):
            return ph
    return None


def _is_dominant(match: str, ctx: RuleContext) -> bool:
    """True if the matched phrase is within the first 2 tokens or title is short."""
    tokens = ctx.tokens
    match_tokens = match.split()
    if len(tokens) <= 3:
        return True
    # Check if match starts in the first two positions
    for i in range(min(2, len(tokens))):
        if tokens[i] == match_tokens[0]:
            return True
    return False


@rule("R-GOV-02")
def check_sovereignty(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 10 — Titles containing words affecting the sovereignty
    and integrity of India will not be registered.
    """
    match = _find_phrase(ctx.normalized, _SOVEREIGNTY_WORDS)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which can be construed as affecting "
                "the sovereignty and integrity of India (PRGI Guideline 10)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-GOV-03")
def check_security_state(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 10 — Titles containing words affecting the Security of
    the State will not be registered.
    """
    security_words = {"state attack", "state enemy", "military secrets"}
    match = _find_phrase(ctx.normalized, security_words)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which can be construed as affecting "
                "the security of the State (PRGI Guideline 10)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-GOV-04")
def check_incite_unrest(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 10 — Titles that incite unrest or disorder will not be
    registered.
    """
    match = _find_phrase(ctx.normalized, _UNREST_WORDS)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which may incite unrest or disorder "
                "(PRGI Guideline 10)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-GOV-05")
def check_government_organizations(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 12 — Titles containing names of Government Organizations /
    Departments, Regulatory/Enforcement Agencies shall not be registered.

    OVER-FIRING GUARD: only flags when the government word is dominant
    (first two tokens or title ≤ 3 tokens).
    """
    match = _find_phrase(ctx.normalized, _GOVT_WORDS)
    if match:
        dominant = _is_dominant(match, ctx)
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains the government/institutional term '{match}'. "
                "Titles suggesting official government affiliation shall not be "
                "registered (PRGI Guideline 12)."
            ),
            trigger_phrase=match,
            requires_human_confirmation=not dominant,  # escalate if not dominant
        )
    return RuleOutcome(passed=True)


@rule("R-GOV-06")
def check_international_organizations(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 12 — Titles containing names of International Organizations
    (e.g., UN, WHO, ILO) in any language shall not be registered.
    """
    match = _find_phrase(ctx.normalized, _INTL_ORGS)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains the international organization name '{match}'. "
                "Such titles shall not be registered (PRGI Guideline 12)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-GOV-07")
def check_welfare_schemes(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 12 — Titles containing names of public welfare schemes of
    Central/State Governments shall not be registered.
    """
    match = _find_phrase(ctx.normalized, _WELFARE_SCHEMES)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains the welfare scheme name '{match}'. Titles "
                "suggesting association with government schemes shall not be "
                "registered (PRGI Guideline 12)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-GOV-08")
def check_national_leaders(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 14 — Titles with the names of national leaders will not
    be registered.
    """
    match = _find_phrase(ctx.normalized, _LEADER_WORDS)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which resembles the name of a "
                "national leader or head of government. Such titles will not be "
                "registered (PRGI Guideline 14)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-GOV-09")
def check_heads_of_government(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 14 — Titles resembling names of Heads of Government and
    functionaries of Central/State governments will not be registered.
    """
    functionary_terms = {"prime minister", "chief minister", "governor", "secretary general"}
    match = _find_phrase(ctx.normalized, functionary_terms)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains the official title '{match}'. Titles referencing "
                "government functionaries will not be registered (PRGI Guideline 14)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)
