"""
ml/rules/checks/duplicates.py
------------------------------
Rules that detect forbidden similarity patterns within a single title
(e.g. repeated words) or against the existing registered title corpus.

RULES IMPLEMENTED HERE
    R-DUP-07  Repeated words within the same title  (not in PRGI guidelines — guard)

    Note: R-DUP-01 through R-DUP-06 (similarity against the existing corpus)
    are retrieval-level checks that run BEFORE the rule engine.  They are not
    implemented here because they require database access, which rule functions
    must never perform (contracts/algo.py constraint).  Those are handled in
    the SHORTLIST and SCORE pipeline stages by Jai's retrieval code.

TECH: collections.Counter
--------------------------
Counter("hello world hello".split()) → Counter({'hello': 2, 'world': 1})
We use it to count how many times each token appears.  If any token appears
more than once in a short title, that is suspicious repetition.
"""

from collections import Counter

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome

# Stopwords that are acceptable even if repeated (e.g. "of" in long titles).
# These are common function words that carry no identifying meaning.
_IGNORE_REPEATED = {
    "the", "of", "and", "in", "for", "a", "an", "to", "at", "by", "with",
    "ke", "ki", "ka",  # Hindi common function words
}


@rule("R-DUP-07")
def check_repeated_words(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    Repeated words within the title.

    NOTE: This restriction is NOT explicitly stated in the PRGI Guidelines
    document in the repository (source_clause_verified=False).  Implemented
    as a practical guard against titles like "News News News".

    HOW THE CHECK WORKS
    -------------------
    1. Tokenise on whitespace (already done in ctx.tokens).
    2. Count each token with Counter.
    3. If any non-stopword token appears more than once, flag it.
    4. Exception: titles with 10+ tokens are allowed one repeated content word
       (long headline-style titles sometimes legitimately repeat a keyword).

    REFERENCE EXAMPLES
    ------------------
    FAIL: "News News News", "Daily Daily"
    PASS: "Daily News", "News of the World"
    """
    tokens = [t.lower() for t in ctx.tokens]
    counts = Counter(tokens)

    max_allowed = 1 if len(tokens) < 10 else 2

    for token, count in counts.items():
        if token in _IGNORE_REPEATED:
            continue
        if count > max_allowed:
            return RuleOutcome(
                passed=False,
                message=(
                    f"The word '{token}' appears {count} times in the title. "
                    "Repeated words within a title are not permitted."
                ),
                trigger_phrase=token,
            )
    return RuleOutcome(passed=True)
