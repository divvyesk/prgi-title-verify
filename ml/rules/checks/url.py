"""
ml/rules/checks/url.py
----------------------
Rules checking for internet URL patterns and internet slang.

RULES IMPLEMENTED
    R-URL-01  URL and domain-style patterns  (unverified — see note)
    R-URL-02  Internet slang                 (unverified — see note)

NOTE ON VERIFICATION
--------------------
Neither R-URL-01 nor R-URL-02 appears explicitly in the PRGI Guidelines
document available in the repository. These rules are implemented as
reasonable practical guards but have source_clause_verified=False.
The frontend had a similar rule (Rule-3.2b) citing:
    'PRGI Digital Alignment Guidelines 2025, Rule 3(2)(b)'
This citation is FABRICATED — "PRGI Digital Alignment Guidelines 2025"
does not exist in the repository. The frontend clause must be removed or
corrected to say "unverified" until the actual source document is found.

PORTED FROM FRONTEND: rulesEngine.ts Rule-3.2b
    - Citation in frontend: 'PRGI Digital Alignment Guidelines 2025, Rule 3(2)(b)'
    - STATUS: FABRICATED — this document and clause do not exist.
    - ACTION NEEDED: Frontend Rule-3.2b must be marked as unverified or removed.
      It is the highest priority correction in the frontend.
"""

from __future__ import annotations
import re
from pathlib import Path

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

_WL_DIR = Path(__file__).parent.parent.parent.parent / "data" / "rules" / "wordlists"

_INTERNET_TERMS = [
    line.strip().lower()
    for line in (_WL_DIR / "internet_terms.txt").read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.startswith("#")
]

# Separate slang from domain patterns
_DOMAIN_PATTERNS = {t for t in _INTERNET_TERMS if t.startswith(".")}
_URL_PREFIXES = {"www.", "http", "https", "@gmail", "@yahoo", "dot com", "dot in"}
_SLANG = {t for t in _INTERNET_TERMS if t in {"lol", "brb", "omg", "wtf", "rofl"}}


@rule("R-URL-01")
def check_url_domain(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    URL and domain-style patterns are not allowed in periodical titles.

    NOTE: source_clause_verified=False — not explicitly in PRGI guidelines doc.
    The frontend Rule-3.2b for this used a FABRICATED citation — see module
    docstring.
    """
    raw = title.lower()
    for term in _DOMAIN_PATTERNS | _URL_PREFIXES:
        if term in raw:
            return RuleOutcome(
                passed=False,
                message=(
                    f"Title contains the URL/domain pattern '{term}'. "
                    "Periodical titles cannot be formatted as web domains or URLs."
                ),
                trigger_phrase=term,
            )
    return RuleOutcome(passed=True)


@rule("R-URL-02")
def check_internet_slang(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    Internet slang is not appropriate for a periodical title.

    NOTE: source_clause_verified=False — not in PRGI guidelines doc.
    Implemented as a practical guard (severity=WARNING, not CRITICAL).
    """
    for slang in _SLANG:
        if re.search(rf"\b{re.escape(slang)}\b", ctx.normalized):
            return RuleOutcome(
                passed=False,
                message=(
                    f"Title contains internet slang '{slang}'. "
                    "Periodical titles should be meaningful and clear."
                ),
                trigger_phrase=slang,
            )
    return RuleOutcome(passed=True)
