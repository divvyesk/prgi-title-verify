"""
Tests for ml/rag/explain.py. Uses real contracts.contracts model instances
(ClashingTitle, RuleViolation) — exactly what backend/app/services/pipeline.py
actually passes in production, not simplified stand-ins.

Run:
    backend/.venv/bin/python ml/rag/test_explain.py
"""

import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import agents.config  # noqa: F401 — loads agents/.env
from contracts.contracts import ClashingTitle, RuleViolation
from ml.rag import explain as explain_module
from ml.rag.explain import explain, get_guard_stats

_REJECTED_VIOLATION = RuleViolation(
    ruleId="R-COM-01",
    ruleName="Commercial and matrimonial catalogue ban",
    severity="CRITICAL",
    description="A title that presents itself as a classifieds, matrimonial or product-listing service is not admissible.",
    clause="PENDING VERIFICATION",
    passed=False,
    triggerPhrase="Matrimonial Classifieds",
)

_REVIEW_CLASH = ClashingTitle(
    title="AJMER JAGRAN", regNo="54657", language="Hindi", state="Rajasthan",
    similarity=88.0, matchType="PHONETIC", reason="Confusingly similar phonetic sound.",
)


def test_approved_verdict_never_calls_llm_or_retrieval():
    # APPROVED short-circuits before any RAG machinery runs — nothing to
    # explain via retrieved rule text when nothing was violated.
    calls_before = get_guard_stats()["calls"]
    explanation, action, citations = explain("Clean Title", "APPROVED", [], [])
    assert "distinct and fully compliant" in explanation
    assert citations == []
    assert get_guard_stats()["calls"] == calls_before, "APPROVED should not touch the guard-tracked LLM path"


def test_guard_does_not_fire_on_a_real_llm_call():
    """The case where the model behaves: a REAL call to the live API,
    instructed to cite only retrieved text, and the guard should not need
    to intervene because the model actually follows the instruction."""
    stats_before = get_guard_stats()
    explanation, action, citations = explain(
        "Royal Matrimonial Classifieds", "REJECTED", [], [_REJECTED_VIOLATION]
    )
    stats_after = get_guard_stats()
    assert explanation and isinstance(explanation, str)
    assert citations, "a REJECTED verdict with a matched rule should retrieve at least one citation"
    assert stats_after["calls"] == stats_before["calls"] + 1
    # Not asserting guard_fired == before here — a live model's behavior on
    # a given day is not something to assert on. What's asserted is that
    # the explanation always ends up sane either way (next test covers the
    # guard actually catching a bad case deterministically).
    print(f"    (live call — guard fired this time: {stats_after['guard_fired'] > stats_before['guard_fired']})")


def test_guard_catches_a_deliberately_fabricated_citation():
    """The case with a deliberately misleading prompt: mock the LLM to
    return a citation for a rule that was NOT retrieved, and assert the
    guard catches it and falls back to the verbatim retrieved text
    instead of the model's fabricated-citation output."""
    fabricated_response = "This violates rule R-TOTALLY-MADE-UP-999, which does not exist in the retrieved guidelines."
    stats_before = get_guard_stats()
    with patch.object(explain_module, "call_llm", return_value=fabricated_response):
        explanation, action, citations = explain(
            "Royal Matrimonial Classifieds", "REJECTED", [], [_REJECTED_VIOLATION]
        )
    stats_after = get_guard_stats()
    assert "R-TOTALLY-MADE-UP-999" not in explanation, "fabricated citation must never reach the user"
    assert stats_after["guard_fired"] == stats_before["guard_fired"] + 1, "guard must have fired exactly once"
    # Verbatim fallback quotes the real retrieved rule_id instead.
    assert "R-COM-01" in explanation or "classifieds" in explanation.lower()


def test_guard_does_not_fire_when_model_correctly_cites_retrieved_rule():
    """Deterministic complement to the fabrication test: mock the LLM to
    correctly cite a rule that WAS retrieved, and confirm the guard does
    NOT fire (no false positives)."""
    correct_response = "This is rejected under R-COM-01 because it presents as a matrimonial classifieds listing."
    stats_before = get_guard_stats()
    with patch.object(explain_module, "call_llm", return_value=correct_response):
        explanation, action, citations = explain(
            "Royal Matrimonial Classifieds", "REJECTED", [], [_REJECTED_VIOLATION]
        )
    stats_after = get_guard_stats()
    assert stats_after["guard_fired"] == stats_before["guard_fired"], "guard must NOT fire on a correctly-cited response"
    assert explanation == correct_response


def test_manual_review_uses_clashing_title_context():
    explanation, action, citations = explain("Jaagran", "MANUAL_REVIEW", [_REVIEW_CLASH], [])
    assert explanation and isinstance(explanation, str)
    assert "geographic" in action.lower() or "qualifier" in action.lower()


if __name__ == "__main__":
    checks = [
        ("APPROVED never touches the guard-tracked LLM path", test_approved_verdict_never_calls_llm_or_retrieval),
        ("guard does not fire on a real LLM call (model behaves)", test_guard_does_not_fire_on_a_real_llm_call),
        ("guard catches a deliberately fabricated citation", test_guard_catches_a_deliberately_fabricated_citation),
        ("guard does not fire on a correctly-cited response", test_guard_does_not_fire_when_model_correctly_cites_retrieved_rule),
        ("MANUAL_REVIEW uses clashing title context", test_manual_review_uses_clashing_title_context),
    ]
    passed, failed = 0, 0
    for name, fn in checks:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except AssertionError as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: unexpected {type(e).__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    print(f"\nFinal guard stats: {get_guard_stats()}")
    raise SystemExit(1 if failed else 0)
