"""
ml/rules/checks/length.py
--------------------------
Rules that check the character length and numeric/abbreviation structure
of the proposed title.

RULES IMPLEMENTED HERE
    R-LEN-01  Abbreviations/acronyms/numerals must be attached to other words
    R-LEN-02  Minimum title length (NOT in PRGI guideline — unverified)
    R-LEN-03  Maximum title length (NOT in PRGI guideline — unverified)
    R-NUM-01  Purely numeric titles are not allowed

TECH: re (Regular Expressions)
-------------------------------
We use Python's built-in `re` module for pattern matching.
    re.fullmatch(pattern, string)  — must match the ENTIRE string
    re.search(pattern, string)     — matches anywhere in the string
    re.sub(pattern, repl, string)  — replace matches

WHY re.fullmatch for numeric check?
    r"[\d\s]+"  means "one or more digits or spaces".
    fullmatch means the ENTIRE title must consist only of digits/spaces.
    "2026 Sports Review" has letters, so fullmatch returns None → passes.
    "12345"  has only digits, so fullmatch returns a Match → fails.
"""

import re

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MIN_CHARS = 3    # our chosen minimum (not stated explicitly in guidelines)
MAX_CHARS = 120  # our chosen maximum (not stated explicitly in guidelines)


@rule("R-LEN-01")
def check_abbreviations(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 4 — Abbreviations, acronyms or numerals will be considered
    only if they are meaningfully and appropriately attached with other words.

    HOW THE CHECK WORKS
    -------------------
    We consider a title to be a "bare abbreviation" when:
      - it consists of only 1–5 uppercase letters (e.g. "IBM", "ABC")
      - AND there are no other words alongside it

    A single token that is all-uppercase AND has ≤5 chars is treated as an
    acronym.  Titles like "ABC Technology Review" pass because they have more
    than one token and the word "Technology" is not an acronym.

    REFERENCE EXAMPLE from the guideline
    --------------------------------------
    FAIL: "IBM", "ABC"           (bare acronym — no other words)
    PASS: "ABC Technology Review" (acronym meaningfully attached to other words)
    """
    # Use the raw title for case-sensitive acronym check, not the lowercased tokens
    raw_tokens = title.strip().split()
    if len(raw_tokens) == 1:
        t = raw_tokens[0]
        # All-uppercase and short → bare acronym
        if t.isupper() and len(t) <= 5:
            return RuleOutcome(
                passed=False,
                message=(
                    f"'{title}' appears to be a bare abbreviation or acronym. "
                    "Abbreviations must be attached to other meaningful words "
                    "(PRGI Guideline 4)."
                ),
                trigger_phrase=t,
            )
    return RuleOutcome(passed=True)


@rule("R-NUM-01")
def check_purely_numeric(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 4 — Abbreviations, acronyms or numerals will be considered
    only if they are meaningfully and appropriately attached with other words.

    A title that consists exclusively of digits (and optional spaces) has no
    meaningful words and cannot serve as a periodical identifier.

    HOW THE CHECK WORKS
    -------------------
    re.fullmatch(r"[\d\s]+", title.strip()) matches only if EVERY character
    in the title is a digit or a space.

    REFERENCE EXAMPLE
    -----------------
    FAIL: "12345", "2026"
    PASS: "2026 Sports Review"  (has letters alongside digits)
    """
    stripped = title.strip()
    if re.fullmatch(r"[\d\s]+", stripped):
        return RuleOutcome(
            passed=False,
            message=(
                f"'{title}' consists entirely of numerals. "
                "Numerals must be attached to other meaningful words "
                "(PRGI Guideline 4)."
            ),
            trigger_phrase=stripped,
        )
    return RuleOutcome(passed=True)


@rule("R-LEN-02")
def check_minimum_length(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    Minimum character length check.

    NOTE: This restriction is NOT explicitly stated in the PRGI Guidelines
    document available in the repository (source_clause_verified=False).
    It is implemented as a practical guard against 1–2 character submissions.
    If the guidelines are later confirmed to contain a minimum length clause,
    update rules/rules.json and set source_clause_verified=True.

    HOW THE CHECK WORKS
    -------------------
    len(title.strip()) — strip removes leading/trailing whitespace so "  A  "
    is treated the same as "A".
    """
    n = len(title.strip())
    if n < MIN_CHARS:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title is {n} character(s); the minimum accepted length "
                f"is {MIN_CHARS} characters."
            ),
            trigger_phrase=title.strip(),
        )
    return RuleOutcome(passed=True)


@rule("R-LEN-03")
def check_maximum_length(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    Maximum character length check.

    NOTE: This restriction is NOT explicitly stated in the PRGI Guidelines
    document available in the repository (source_clause_verified=False).
    Implemented as a practical safeguard.

    HOW THE CHECK WORKS
    -------------------
    Same as minimum length — strip then measure.
    """
    n = len(title.strip())
    if n > MAX_CHARS:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title is {n} characters; the maximum accepted length "
                f"is {MAX_CHARS} characters."
            ),
            trigger_phrase=title.strip()[:30] + "...",
        )
    return RuleOutcome(passed=True)
