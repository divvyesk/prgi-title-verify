"""
ml/rules/checks/decency.py
--------------------------
Rules checking for obscene, offensive, and public-decency violations.

RULES IMPLEMENTED
    R-DEC-01  Negative religious connotations  (Guideline 3)
    R-DEC-02  Obscene titles                   (Guideline 3)
    R-DEC-03  Absurd or offensive titles       (Guideline 3)
    R-DEC-04  Crime/corruption word misuse     (Guideline 3)

PORTED FROM FRONTEND: rulesEngine.ts Rule-6.1b
    - Citation in frontend: 'PRGI Ethical & Public Order Standards 2025, Rule 6(1)(b)'
    - STATUS: UNVERIFIED — "Rule 6(1)(b)" and "PRGI Ethical & Public Order
      Standards 2025" do not appear in the Guidelines document in the repository.
      The actual clause is Guideline 3.
    - ACTION NEEDED: Frontend Rule-6.1b clause should be corrected to cite
      "PRGI Guidelines for Admissibility of Titles, Guideline 3".

OVER-FIRING GUARD (CRITICAL)
    Words like "crime" and "corruption" appear legitimately in titles like
    "Anti-Crime Daily" or "Corruption Watch". We ONLY flag if the word
    appears as the LEADING concept (first token) OR appears without any
    qualifying anti/watch/awareness context around it.
    Specifically, we skip flagging if any of {"anti", "watch", "awareness",
    "against", "combat"} appears elsewhere in the title.
"""

from __future__ import annotations
import re
from pathlib import Path

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

_WL_DIR = Path(__file__).parent.parent.parent.parent / "data" / "rules" / "wordlists"

_DECENCY_WORDS = [
    line.strip().lower()
    for line in (_WL_DIR / "decency.txt").read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.startswith("#")
]

_CRIME_WORDS = {"crime", "corruption", "scam", "fraud"}
_OBSCENE_WORDS = {"obscene", "vulgar", "porn", "adult", "xxx"}
_HATE_WORDS = {"hate", "murder", "rape", "riot", "stupid", "absurd", "idiot"}

# Context words that indicate the bad word is being used critically, not promoted
_REDEMPTIVE_CONTEXT = {"anti", "watch", "awareness", "against", "combat", "expose", "fighter"}


def _has_word(normalized: str, word: str) -> bool:
    return bool(re.search(rf"\b{re.escape(word)}\b", normalized))


def _has_redemptive_context(ctx: RuleContext) -> bool:
    return any(tok in _REDEMPTIVE_CONTEXT for tok in ctx.tokens)


@rule("R-DEC-01")
def check_religious_negative(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 3 — Titles with negative connotations with religious
    sentiments will not be registered.
    """
    religious_negative = {"anti-faith", "anti-religion", "god is fake", "no god"}
    for phrase in religious_negative:
        if phrase in ctx.normalized:
            return RuleOutcome(
                passed=False,
                message=(
                    f"Title appears to have negative religious connotations. "
                    "Such titles will not be registered (PRGI Guideline 3)."
                ),
                trigger_phrase=phrase,
            )
    return RuleOutcome(passed=True)


@rule("R-DEC-02")
def check_obscene(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 3 — Obscene titles will not be registered.
    """
    for word in _OBSCENE_WORDS:
        if _has_word(ctx.normalized, word):
            return RuleOutcome(
                passed=False,
                message=(
                    f"Title contains the obscene term '{word}'. "
                    "Obscene titles will not be registered (PRGI Guideline 3)."
                ),
                trigger_phrase=word,
            )
    return RuleOutcome(passed=True)


@rule("R-DEC-03")
def check_offensive(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 3 — Titles offensive to public sentiments will not be
    registered.
    """
    for word in _HATE_WORDS:
        if _has_word(ctx.normalized, word) and not _has_redemptive_context(ctx):
            return RuleOutcome(
                passed=False,
                message=(
                    f"Title contains '{word}', which is offensive to public "
                    "sentiments. Such titles will not be registered (PRGI Guideline 3)."
                ),
                trigger_phrase=word,
            )
    return RuleOutcome(passed=True)


@rule("R-DEC-04")
def check_crime_misuse(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 3 — Titles that could be misused with words like "crime",
    "corruption" etc. will not be registered.

    OVER-FIRING GUARD
    -----------------
    We skip flagging if the title contains a redemptive context word
    (e.g. "Anti-Corruption Watch" should NOT be rejected).
    We also only flag if the crime word is among the first two tokens,
    indicating it is the primary subject of the title.
    """
    for word in _CRIME_WORDS:
        if _has_word(ctx.normalized, word):
            if _has_redemptive_context(ctx):
                continue  # "Anti-Corruption Watch" → pass
            # Check if it's the dominant concept (first 2 tokens)
            if ctx.tokens and ctx.tokens[0] in _CRIME_WORDS:
                return RuleOutcome(
                    passed=False,
                    message=(
                        f"Title leads with '{word}', which could be misused. "
                        "Titles starting with crime/corruption terms will not be "
                        "registered (PRGI Guideline 3)."
                    ),
                    trigger_phrase=word,
                )
    return RuleOutcome(passed=True)
