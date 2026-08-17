"""
ml/rules/checks/commercial.py
------------------------------
Rules checking for commercial/catalogue publication patterns.

RULES IMPLEMENTED
    R-COM-01  Advertisement/Classifieds keywords  (Guideline 17)
    R-COM-02  Matrimonial/Panchang keywords        (Guideline 17)
    R-COM-03  Yellow pages/Directory keywords      (Guideline 17)

PORTED FROM FRONTEND: rulesEngine.ts Rule-4.1a
    - Citation in frontend: 'PRGI Guidelines 2025, Section 4.1(a) Commercial Publications'
    - STATUS: UNVERIFIED — "Section 4.1(a)" does not appear in the PRGI Guidelines
      document in the repository. The real clause is Guideline 17.
    - ACTION NEEDED: Frontend Rule-4.1a clause should be corrected to cite
      "PRGI Guidelines for Admissibility of Titles, Guideline 17".

OVER-FIRING GUARD
    Each check requires the matched word to appear in the title as a standalone
    semantic unit — we check for word-boundary via spaces, not bare substring.
    "Matrilocal Studies" should NOT match "matrimonial".
    We use a helper _has_word() that checks for the phrase surrounded by
    word boundaries (\b in regex).
"""

from __future__ import annotations
import re
from pathlib import Path

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

_WL_DIR = Path(__file__).parent.parent.parent.parent / "data" / "rules" / "wordlists"


def _load(filename: str) -> list[str]:
    path = _WL_DIR / filename
    if not path.exists():
        return []
    return [
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]


_COMMERCIAL_WORDS = _load("commercial.txt")

# Split into sub-categories for more specific rule messages
_MATRIMONIAL = {"matrimonial", "vivah suchi", "shaadi suchi", "rishta"}
_DIRECTORY = {"yellow pages", "white pages", "pink pages", "directory", "pamphlet", "brochure"}
_CLASSIFIEDS = {"classifieds", "classified", "ad listing", "advertisement"}
_TENDER = {"tender", "panchang", "calendar"}


def _has_phrase(text: str, phrase: str) -> bool:
    """
    Returns True if `phrase` appears as a whole word/phrase in `text`.
    Uses \b word-boundary anchors for single words; for multi-word phrases,
    requires at least a space boundary.
    """
    # For multi-word phrases, simple substring with space padding check
    if " " in phrase:
        return phrase in text
    # For single words, use word-boundary regex
    return bool(re.search(rf"\b{re.escape(phrase)}\b", text))


def _find_match(normalized: str, word_list: list[str]) -> str | None:
    for word in word_list:
        if _has_phrase(normalized, word):
            return word
    return None


@rule("R-COM-01")
def check_advertisement_classifieds(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 17 — Titles using words like Ad or Advertisement, Classifieds
    shall not be registered.
    """
    match = _find_match(ctx.normalized, list(_CLASSIFIEDS))
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which indicates a commercial listing "
                "or advertisement catalogue. Such titles shall not be registered "
                "(PRGI Guideline 17)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-COM-02")
def check_matrimonial_panchang(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 17 — Titles using words like Matrimonial, Panchang, Calendar
    shall not be registered.
    """
    words_to_check = list(_MATRIMONIAL | _TENDER)
    match = _find_match(ctx.normalized, words_to_check)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which indicates a matrimonial, "
                "almanac or calendar publication. Such titles shall not be "
                "registered (PRGI Guideline 17)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-COM-03")
def check_yellow_pages_directory(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 17 — Titles using words like Yellow pages, pamphlet,
    brochure, directory shall not be registered.
    """
    match = _find_match(ctx.normalized, list(_DIRECTORY))
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which indicates a directory or "
                "listings publication. Such titles shall not be registered "
                "(PRGI Guideline 17)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)
