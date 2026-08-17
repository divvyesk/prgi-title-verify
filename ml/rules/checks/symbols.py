"""
ml/rules/checks/symbols.py
--------------------------
Rules that check for non-text characters, emojis, mathematical symbols,
and other disallowed character patterns in the title.

RULES IMPLEMENTED HERE
    R-SYM-01  Non-text characters, emojis, signs, symbols
    R-SYM-02  Mathematical symbols specifically (e.g. +, *, =)

TECH: unicodedata
-----------------
Python's built-in unicodedata module gives us the Unicode category of every
character.  The category is a two-letter code:
    "L"  → Letter (La, Ll, Lu, etc.)
    "N"  → Number (Nd=decimal digit, Nl=letter number, etc.)
    "Z"  → Separator (Zs=space, Zl=line, Zp=paragraph)
    "P"  → Punctuation (Pc, Pd, Po, …)
    "S"  → Symbol    (Sm=math, Sc=currency, So=other)
    "C"  → Other / control chars
    "M"  → Mark (combining characters)

We use category().startswith("S") to catch Sm (math symbols like +, *, =)
and emoji-style So characters.  We also explicitly catch "C" (control chars).

TECH: emoji detection
---------------------
The emoji Unicode block starts around U+1F600.  We additionally check
ord(char) > 0x2000 and the category starts with "S" to catch modern emoji
like 😀 (U+1F600) and 🎉 (U+1F389).

REFERENCE EXAMPLES from PRGI Guideline 7
-----------------------------------------
FAIL: "@#*! News", "Tech+Review", "A+ Grade News"
PASS: "Tech Review", "A Grade News"
"""

import re
import unicodedata

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

# Mathematical symbols that are explicitly called out in Guideline 7
_MATH_SYMBOLS_RE = re.compile(r"[+\-*/=<>÷×±∑∏√∞∫∂∇]")

# Any non-alphanumeric, non-space, non-hyphen character is suspicious
# We allow: letters, digits, spaces, hyphens (for hyphenated titles like "Indo-Pacific")
_ALLOWED_CHARS_RE = re.compile(r"[^\w\s\-]", re.UNICODE)


def _has_emoji(text: str) -> tuple[bool, str | None]:
    """Return (True, offending_char) if the text contains any emoji or symbol."""
    for ch in text:
        cat = unicodedata.category(ch)
        # Unicode "Symbol" category (Sm, Sc, Sk, So) covers most emoji + math
        if cat.startswith("S"):
            return True, ch
        # High codepoints not in Latin/common block  → likely emoji
        if ord(ch) > 0x2000 and cat.startswith(("M", "C")):
            return True, ch
    return False, None


@rule("R-SYM-01")
def check_non_text_characters(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 7 — Titles containing non-text characters, or any form of
    signs, symbols including mathematical symbols, pictographs, photographs,
    hallmarks, logos, monograms, phonograms, emojis, etc. are not allowed.

    HOW THE CHECK WORKS
    -------------------
    1. Check for emoji / Unicode symbol characters via unicodedata category.
    2. Check for any non-alphanumeric, non-space, non-hyphen ASCII characters.
    The first match stops the check and reports the offending character.
    """
    # Step 1: emoji / unicode symbols
    found_emoji, bad_char = _has_emoji(title)
    if found_emoji:
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains a non-text character '{bad_char}'. "
                "Signs, symbols, pictographs, and emojis are not allowed "
                "(PRGI Guideline 7)."
            ),
            trigger_phrase=bad_char,
        )

    # Step 2: disallowed punctuation / special ASCII
    match = _ALLOWED_CHARS_RE.search(title)
    if match:
        bad = match.group()
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains the character '{bad}' which is not allowed. "
                "Only letters, digits, spaces and hyphens are permitted "
                "(PRGI Guideline 7)."
            ),
            trigger_phrase=bad,
        )

    return RuleOutcome(passed=True)


@rule("R-SYM-02")
def check_mathematical_symbols(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    PRGI Guideline 7 — Titles containing mathematical symbols like '+', '*'
    etc. are not allowed.

    This is a narrower sub-check of R-SYM-01 specifically for math symbols
    that Guideline 7 calls out by name.  It exists as its own rule so the
    rejection message can cite the exact example from the guideline.

    HOW THE CHECK WORKS
    -------------------
    A compiled regex _MATH_SYMBOLS_RE matches any of the explicitly listed
    mathematical symbols.  re.search() finds the first match anywhere in the
    title.
    """
    match = _MATH_SYMBOLS_RE.search(title)
    if match:
        bad = match.group()
        return RuleOutcome(
            passed=False,
            message=(
                f"Title contains the mathematical symbol '{bad}'. "
                "Mathematical symbols are not permitted in periodical titles "
                "(PRGI Guideline 7)."
            ),
            trigger_phrase=bad,
        )
    return RuleOutcome(passed=True)
