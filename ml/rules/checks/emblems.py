"""
ml/rules/checks/emblems.py
--------------------------
Rules checking for national symbol and Emblems Act violations.

RULES IMPLEMENTED
    R-EMB-01  National symbols  (Guideline 11)
    R-EMB-02  National motto    (Guideline 11)
    R-EMB-03  Emblems Act 1950  (Guideline 11)

PORTED FROM FRONTEND: rulesEngine.ts Rule-2.1a (partially)
    See government.py for full frontend citation audit.
"""

from __future__ import annotations
from pathlib import Path

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

_WL_DIR = Path(__file__).parent.parent.parent.parent / "data" / "rules" / "wordlists"

_EMBLEM_WORDS = [
    line.strip().lower()
    for line in (_WL_DIR / "emblems.txt").read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.startswith("#")
]

_NATIONAL_MOTTOS = {"satyameva jayate", "jana gana mana", "vande mataram"}
_NATIONAL_SYMBOLS = {"ashoka", "ashoka chakra", "tiranga", "tricolour", "national flag"}


def _contains(normalized: str, phrases: set | list) -> str | None:
    for ph in phrases:
        if ph in normalized:
            return ph
    return None


@rule("R-EMB-01")
def check_national_symbols(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 11 — Titles similar to any national symbol will not be
    registered.
    """
    match = _contains(ctx.normalized, _NATIONAL_SYMBOLS)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which is a national symbol. "
                "Such titles will not be registered (PRGI Guideline 11)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-EMB-02")
def check_national_motto(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 11 — Titles similar to any national motto will not be
    registered.
    """
    match = _contains(ctx.normalized, _NATIONAL_MOTTOS)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which is the national motto. "
                "Such titles will not be registered (PRGI Guideline 11)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)


@rule("R-EMB-03")
def check_emblems_act(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 11 — Titles violative of The Emblems and Names (Prevention
    of Improper Use) Act, 1950 will not be registered.

    This is a broader catch for any emblem-related term not covered by
    R-EMB-01 and R-EMB-02.
    """
    remaining = [w for w in _EMBLEM_WORDS
                 if w not in _NATIONAL_SYMBOLS and w not in _NATIONAL_MOTTOS]
    match = _contains(ctx.normalized, remaining)
    if match:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains '{match}', which may violate The Emblems and "
                "Names (Prevention of Improper Use) Act, 1950 (PRGI Guideline 11)."
            ),
            trigger_phrase=match,
        )
    return RuleOutcome(passed=True)
