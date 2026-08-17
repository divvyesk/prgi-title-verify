"""
ml/rules/checks/semantic.py
----------------------------
Stub for semantic rule R-SEM-01 — detecting banned meanings in translated or
transliterated titles. This is the ONE rule in the engine allowed to call
a language model.

RULES IMPLEMENTED
    R-SEM-01  Banned meaning in translated/transliterated title  (stub)

CONSTRAINT — MUST NEVER AUTO-FAIL A TITLE
------------------------------------------
This rule is allowed to call a language model (supplied by Suhani in ml/rag/).
Under NO circumstances may this function return passed=False without also
setting requires_human_confirmation=True.

The reason: language model outputs are probabilistic. A model might incorrectly
claim that a Kannada title translates to a banned phrase. Auto-rejecting based
on an unconfirmed model output would deny a legitimate applicant without recourse.
This constraint must be preserved even when Suhani replaces the stub body.

HOW TO INTEGRATE (for Suhani)
------------------------------
Replace the body of check_semantic_meaning() below. Your implementation must:
1. Call the language model to check if ctx.normalized has a banned meaning
   in any other language.
2. If the model returns a concern → return RuleOutcome(
       passed=False,
       message="...",
       requires_human_confirmation=True   ← MANDATORY
   )
3. If the model returns no concern → return RuleOutcome(passed=True)
4. If the model call fails for any reason → return RuleOutcome(passed=True)
   (fail open, not fail closed — the engine will log the failure separately)
"""

from ml.rules.registry import rule
from ml.rules.types import RuleContext, RuleOutcome


@rule("R-SEM-01")
def check_semantic_meaning(title: str, ctx: RuleContext) -> RuleOutcome:
    """
    Detect whether a transliterated or translated title contains a banned meaning.

    THIS IS A STUB. The real implementation will be supplied by Suhani (ml/rag/).

    Current behaviour: always returns INFO with requires_human_confirmation=True
    so that a PRGI officer is reminded to consider cross-language meanings,
    without ever auto-failing a title.

    CONSTRAINT: This function MUST NEVER return passed=False without also
    setting requires_human_confirmation=True. See module docstring.
    """
    return RuleOutcome(
        passed=True,
        message=(
            "Semantic/cross-language check not yet implemented. "
            "PRGI officer should verify that the title does not have a banned "
            "meaning in another language or script."
        ),
        requires_human_confirmation=True,
    )
