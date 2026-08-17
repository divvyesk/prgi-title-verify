"""
tests/test_rule_engine_foundation.py
-------------------------------------
Tests for the four foundational rules: R-LEN-01, R-NUM-01, R-SYM-01, R-DUP-07.

TECH: pytest
------------
pytest is the standard Python testing framework.
    - Functions starting with `test_` are automatically discovered and run.
    - @pytest.mark.parametrize runs one function with many input sets so we
      don't repeat ourselves.
    - pytest.param("value", id="my_test_name") gives each case a human-readable
      name in the output so failures are easy to locate.

HOW TO RUN
----------
    cd /path/to/prgi-title-verify
    pip install pytest          # one-time
    python -m pytest tests/test_rule_engine_foundation.py -v

The -v flag prints each test name so you can see pass/fail per case.

WHY THESE TESTS?
----------------
Each test validates a specific guarantee we make:
1.  FAIL tests  — a title that MUST trigger the rule.  If it passes, our
    detection logic is wrong.
2.  PASS tests  — a title that must NOT trigger the rule.  If it fails, our
    rule is over-firing (false positive), which is worse than missing a case.
3.  Engine never raises — even a broken rule function must not crash the
    whole request.
4.  Metadata attached — the citation comes from rules.json, not hard-coded.
"""

import pytest

from ml.rules.engine import check_all, RuleViolation
from ml.rules.types import RuleContext

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ctx(title: str, applicant_name: str | None = None) -> RuleContext:
    """Build a minimal RuleContext from a raw title string."""
    normalized = title.strip().lower()
    tokens = normalized.split()
    return RuleContext(
        normalized=normalized,
        tokens=tokens,
        language=None,
        script=None,
        applicant_name=applicant_name,
    )


def get_violation(rule_id: str, title: str, **ctx_kwargs) -> RuleViolation:
    """Run check_all and return the RuleViolation for a specific rule_id."""
    violations = check_all(title, ctx(title, **ctx_kwargs))
    for v in violations:
        if v.rule_id == rule_id:
            return v
    raise AssertionError(f"Rule {rule_id} not found in results for title '{title}'")


# ---------------------------------------------------------------------------
# R-LEN-01 — Abbreviations and acronyms
# ---------------------------------------------------------------------------
class TestRLen01:
    """
    Guideline 4: Abbreviations/acronyms must be attached to other words.
    A bare single-token all-uppercase string of ≤5 chars must fail.
    """

    @pytest.mark.parametrize("title", [
        pytest.param("IBM",   id="bare-acronym-IBM"),
        pytest.param("ABC",   id="bare-acronym-ABC"),
        pytest.param("UN",    id="bare-acronym-UN"),
    ])
    def test_fails_bare_acronym(self, title):
        v = get_violation("R-LEN-01", title)
        assert not v.passed, f"Expected R-LEN-01 to FAIL for '{title}'"
        assert v.trigger_phrase is not None

    @pytest.mark.parametrize("title", [
        pytest.param("ABC Technology Review",  id="acronym-with-words"),
        pytest.param("United Nations Report",  id="spelled-out-name"),
        pytest.param("Morning Herald",         id="two-common-words"),
    ])
    def test_passes_with_other_words(self, title):
        v = get_violation("R-LEN-01", title)
        assert v.passed, f"Expected R-LEN-01 to PASS for '{title}', but got: {v.message}"


# ---------------------------------------------------------------------------
# R-NUM-01 — Purely numeric titles
# ---------------------------------------------------------------------------
class TestRNum01:
    """
    Guideline 4: Numerals must be attached to other words.
    A title consisting entirely of digits must fail.
    """

    @pytest.mark.parametrize("title", [
        pytest.param("12345",    id="five-digits"),
        pytest.param("2026",     id="year-only"),
        pytest.param("1 2 3",    id="spaced-digits"),
    ])
    def test_fails_purely_numeric(self, title):
        v = get_violation("R-NUM-01", title)
        assert not v.passed, f"Expected R-NUM-01 to FAIL for '{title}'"

    @pytest.mark.parametrize("title", [
        pytest.param("2026 Sports Review", id="year-with-words"),
        pytest.param("Channel 9 News",     id="number-with-words"),
        pytest.param("Daily Herald",       id="no-numbers"),
    ])
    def test_passes_number_with_words(self, title):
        v = get_violation("R-NUM-01", title)
        assert v.passed, f"Expected R-NUM-01 to PASS for '{title}', but got: {v.message}"


# ---------------------------------------------------------------------------
# R-SYM-01 — Non-text characters and emojis
# ---------------------------------------------------------------------------
class TestRSym01:
    """
    Guideline 7: No signs, symbols, emojis, or non-text characters.
    """

    @pytest.mark.parametrize("title", [
        pytest.param("@#*! News",    id="punctuation-prefix"),
        pytest.param("Tech😀Review", id="emoji-embedded"),
        pytest.param("News★Daily",   id="star-symbol"),
    ])
    def test_fails_symbols(self, title):
        v = get_violation("R-SYM-01", title)
        assert not v.passed, f"Expected R-SYM-01 to FAIL for '{title}'"
        assert v.trigger_phrase is not None

    @pytest.mark.parametrize("title", [
        pytest.param("Tech Review",          id="plain-words"),
        pytest.param("Indo-Pacific Report",  id="hyphen-allowed"),
        pytest.param("Daily 2026 Herald",    id="alphanumeric"),
    ])
    def test_passes_clean_titles(self, title):
        v = get_violation("R-SYM-01", title)
        assert v.passed, f"Expected R-SYM-01 to PASS for '{title}', but got: {v.message}"


# ---------------------------------------------------------------------------
# R-DUP-07 — Repeated words within a title
# ---------------------------------------------------------------------------
class TestRDup07:
    """
    Guard rule: repeated words within the same title are not permitted.
    (Source clause not verified in PRGI guidelines, but reasonable guard.)
    """

    @pytest.mark.parametrize("title", [
        pytest.param("News News News",  id="triple-news"),
        pytest.param("Daily Daily",     id="double-daily"),
    ])
    def test_fails_repeated_words(self, title):
        v = get_violation("R-DUP-07", title)
        assert not v.passed, f"Expected R-DUP-07 to FAIL for '{title}'"

    @pytest.mark.parametrize("title", [
        pytest.param("Daily News",             id="two-different-words"),
        pytest.param("News of the World",      id="stopwords-dont-count"),
        pytest.param("The Times of India",     id="common-title-structure"),
    ])
    def test_passes_normal_titles(self, title):
        v = get_violation("R-DUP-07", title)
        assert v.passed, f"Expected R-DUP-07 to PASS for '{title}', but got: {v.message}"


# ---------------------------------------------------------------------------
# Cross-cutting: engine guarantees
# ---------------------------------------------------------------------------
class TestEngineGuarantees:
    """Tests that verify the behaviour of check_all() itself, not any one rule."""

    def test_check_all_never_raises_on_empty_string(self):
        """check_all must return a list even for an empty title."""
        result = check_all("", ctx(""))
        assert isinstance(result, list)

    def test_check_all_never_raises_on_unicode(self):
        """check_all must handle non-ASCII input without crashing."""
        result = check_all("नमस्ते टाइम्स", ctx("नमस्ते टाइम्स"))
        assert isinstance(result, list)

    def test_every_violation_has_rule_id(self):
        """Every RuleViolation must have a non-empty rule_id."""
        result = check_all("ABC", ctx("ABC"))
        for v in result:
            assert v.rule_id, "RuleViolation missing rule_id"

    def test_every_violation_has_source_clause(self):
        """
        Every RuleViolation must have a non-empty source_clause.
        Even unverified rules must describe where we looked.
        """
        result = check_all("ABC", ctx("ABC"))
        for v in result:
            assert v.source_clause, f"RuleViolation {v.rule_id} has empty source_clause"

    def test_metadata_comes_from_json_not_code(self):
        """
        The rule_name in the violation must match the value in rules.json,
        proving it was read from the file and not hard-coded.
        """
        import json
        with open("rules/rules.json") as f:
            rules_meta = {r["rule_id"]: r for r in json.load(f)}

        result = check_all("IBM", ctx("IBM"))
        for v in result:
            if v.rule_id in rules_meta:
                expected_name = rules_meta[v.rule_id]["name"]
                assert v.rule_name == expected_name, (
                    f"{v.rule_id}: rule_name in violation is '{v.rule_name}' "
                    f"but rules.json says '{expected_name}'"
                )
