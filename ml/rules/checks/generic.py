"""
ml/rules/checks/generic.py
--------------------------
Rules checking for generic root words and insignificant prefix/suffix patterns.

RULES IMPLEMENTED
    R-GEN-01  Single generic/root word titles  (Guideline 1)
    R-GEN-02  Single-word title (one word, any word)  (Guideline 1)
    R-GEN-03  Insignificant prefix added to existing title  (Guideline 8)
    R-GEN-04  Insignificant suffix added to existing title  (Guideline 8)
    R-GEN-05  City/state name added as prefix/suffix  (Guideline 8)

PORTED FROM FRONTEND: rulesEngine.ts Rule-1.1a (Single Generic Root Disallowance)
    - Citation in frontend: 'Press and Registration of Periodicals Act, Section 5(1)'
    - STATUS: UNVERIFIED — Section 5(1) of the PRP Act 2023 governs registration
      procedure, not title admissibility. The actual clause is in the PRGI
      Guidelines document (Guideline 1), which IS verified.
    - ACTION NEEDED: Frontend Rule-1.1a clause text should be corrected to cite
      "PRGI Guidelines for Admissibility of Titles, Guideline 1".

OVER-FIRING GUARD (R-GEN-03 / R-GEN-04 / R-GEN-05)
    These rules only fire if the title is ENTIRELY composed of a generic suffix
    plus a stopword, or is a single token from the suffix list. A title like
    "Daily Independent Voice" passes because "Independent Voice" is distinctive.
"""

from __future__ import annotations
from pathlib import Path

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

# ---------------------------------------------------------------------------
# Load word lists at import time
# ---------------------------------------------------------------------------
_WL_DIR = Path(__file__).parent.parent.parent.parent / "data" / "rules" / "wordlists"


def _load(filename: str) -> set[str]:
    path = _WL_DIR / filename
    if not path.exists():
        return set()
    return {
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    }


_GENERIC_ROOTS = _load("generic_roots.txt")
_GENERIC_SUFFIXES = _load("generic_suffixes.txt")

# Indian state names — titles like "Delhi Times" where Delhi is added to an
# existing title. This is a curated subset; a full list would be a separate file.
_INDIAN_STATES = {
    "delhi", "mumbai", "pune", "chennai", "bangalore", "bengaluru", "hyderabad",
    "kolkata", "ahmedabad", "jaipur", "lucknow", "patna", "bhopal", "raipur",
    "chandigarh", "guwahati", "bhubaneswar", "thiruvananthapuram", "india",
    "gujarat", "rajasthan", "maharashtra", "punjab", "haryana", "kerala",
    "karnataka", "tamilnadu", "tamil", "andhra", "telangana", "odisha",
    "assam", "bihar", "jharkhand", "uttarakhand", "himachal",
}


@rule("R-GEN-01")
def check_generic_root_word(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 1 — Generic, or root word titles shall not be registered.

    HOW THE CHECK WORKS
    -------------------
    If the title is exactly ONE token AND that token appears in the generic
    root wordlist, it fails.  A two-word title like "Daily Manthan" passes
    even though "Daily" and "Manthan" are both in the wordlist individually.
    """
    if len(ctx.tokens) == 1 and ctx.tokens[0] in _GENERIC_ROOTS:
        return RuleOutcome(
            passed=False,
            message=(
                f"'{title}' is a single generic/root word. Such titles shall "
                "not be registered (PRGI Guideline 1)."
            ),
            trigger_phrase=ctx.tokens[0],
        )
    return RuleOutcome(passed=True)


@rule("R-GEN-02")
def check_single_word_title(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 1 — Titles should preferably contain more than one word.

    A single-word title that is NOT in the generic root list is a WARNING,
    not CRITICAL, because the guideline says "preferably" not "must".
    """
    if len(ctx.tokens) == 1:
        return RuleOutcome(
            passed=False,
            message=(
                f"'{title}' is a single-word title. Titles should preferably "
                "contain more than one distinct and meaningful term (PRGI Guideline 1)."
            ),
            trigger_phrase=ctx.tokens[0],
        )
    return RuleOutcome(passed=True)


@rule("R-GEN-03")
def check_generic_prefix(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 8 — Titles formed by insignificantly prefixing generic
    terms to an existing title will not be approved.

    OVER-FIRING GUARD (tightened)
    ------------------------------
    Flags only when BOTH tokens are generic/root words — e.g. "Daily News",
    "Dainik Samachar". Titles like "Daily Statesman" pass because "Statesman"
    is a distinctive word not in the generic list.
    """
    tokens = ctx.tokens
    if len(tokens) == 2 and tokens[0] in _GENERIC_SUFFIXES and tokens[1] in _GENERIC_ROOTS | _GENERIC_SUFFIXES:
        return RuleOutcome(
            passed=False,
            message=(
                f"'{title}' combines two generic terms. Titles formed by "
                f"insignificantly prefixing '{tokens[0]}' to a generic word "
                "will not be approved (PRGI Guideline 8)."
            ),
            trigger_phrase=tokens[0],
        )
    return RuleOutcome(passed=True)


@rule("R-GEN-04")
def check_generic_suffix(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 8 — Titles formed by insignificantly suffixing generic
    terms to an existing title will not be approved.

    OVER-FIRING GUARD (tightened)
    ------------------------------
    Only flags when BOTH tokens are generic — same logic as R-GEN-03.
    "Jagruti Today" passes because "Jagruti" is not in the generic list.
    "Samachar Khabar" fails because both are in the generic list.
    """
    tokens = ctx.tokens
    if len(tokens) == 2 and tokens[-1] in _GENERIC_SUFFIXES and tokens[0] in _GENERIC_ROOTS | _GENERIC_SUFFIXES:
        return RuleOutcome(
            passed=False,
            message=(
                f"'{title}' combines two generic terms. Titles formed by "
                f"insignificantly suffixing '{tokens[-1]}' to a generic word "
                "will not be approved (PRGI Guideline 8)."
            ),
            trigger_phrase=tokens[-1],
        )
    return RuleOutcome(passed=True)


@rule("R-GEN-05")
def check_city_state_addition(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 8 — Titles formed by adding city or state names to an
    existing title will not be approved.

    OVER-FIRING GUARD (tightened)
    ------------------------------
    Only fires when 2-token title has a location + a GENERIC word.
    "Rajasthan Pioneer" passes — "Pioneer" is distinctive.
    "Rajasthan Samachar" fails — "Samachar" is generic.
    """
    tokens = ctx.tokens
    if len(tokens) == 2:
        for tok in tokens:
            if tok in _INDIAN_STATES:
                other_tok = next((t for t in tokens if t != tok), None)
                if other_tok and other_tok in _GENERIC_ROOTS | _GENERIC_SUFFIXES:
                    return RuleOutcome(
                        passed=False,
                        message=(
                            f"'{title}' appears to add the location '{tok}' as an "
                            f"insignificant qualifier to the generic word '{other_tok}'. "
                            "This is not permitted (PRGI Guideline 8)."
                        ),
                        trigger_phrase=tok,
                    )
    return RuleOutcome(passed=True)
