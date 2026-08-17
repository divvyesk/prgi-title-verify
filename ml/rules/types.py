"""
ml/rules/types.py
-----------------
Data structures shared by every rule function and the engine.

WHY DATACLASSES?
    Python's @dataclass decorator auto-generates __init__, __repr__, and __eq__
    from the field annotations, so we never write boilerplate constructors.
    It also makes objects printable for free, which is very useful in tests.

WHY TWO SEPARATE CLASSES?
    RuleContext  → what the rule RECEIVES  (the title and metadata about it)
    RuleOutcome  → what the rule RETURNS   (did it pass? why not?)
    Keeping input and output separate means each rule function has a single,
    testable responsibility: string-in, verdict-out.
"""

from dataclasses import dataclass, field


@dataclass
class RuleContext:
    """
    Everything a rule function knows about the submitted title.

    Fields
    ------
    normalized      : The cleaned, lowercased, whitespace-collapsed title string.
                      Use this for most checks — it strips accents and normalises
                      Unicode so 'Ñ' and 'N' don't confuse a length check.
    tokens          : The normalized title split on whitespace.
                      Pre-computed so every rule doesn't have to call .split().
    language        : BCP-47 language tag detected by the normaliser, e.g. "hi",
                      "ta", "en".  May be None if detection failed.
    script          : Unicode script name, e.g. "Latin", "Devanagari", "Tamil".
                      May be None.
    applicant_name  : Full name of the applicant as given in the registration
                      form.  Used only by R-PER-01 (personal name check).
                      May be None if the caller did not supply it.
    """
    normalized: str
    tokens: list[str]
    language: str | None = None
    script: str | None = None
    applicant_name: str | None = None


@dataclass
class RuleOutcome:
    """
    The verdict returned by a single rule function.

    Fields
    ------
    passed                    : True → the title satisfies this rule.
                                False → the rule triggered a violation.
    message                   : Human-readable explanation shown in the UI.
                                Keep it under ~120 characters.
    trigger_phrase            : The exact substring of the title that caused the
                                failure.  Used by the frontend to highlight the
                                offending text.  None when the rule passed.
    requires_human_confirmation: When True, the engine records the violation but
                                does NOT auto-reject — it escalates to a PRGI
                                officer.  Used for rules that need context a
                                machine cannot reliably judge (e.g. R-SEM-01).
    """
    passed: bool
    message: str = ""
    trigger_phrase: str | None = None
    requires_human_confirmation: bool = False
