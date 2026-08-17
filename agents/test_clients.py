"""
Smoke test for agents/clients.py. No LLM, no backend, no network — just
proves the fixture client reads real fixture files and returns the
verify_batch dict shape the Verifier node (Prompt 4) will consume.

Run:
    backend/.venv/bin/python agents/test_clients.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.clients import FixtureVerifyClient


def test_exact_match_titles_return_curated_verdicts():
    client = FixtureVerifyClient()
    results = client.verify_batch(["Times India", "Aditi National Strategy Review"])
    assert len(results) == 2
    assert results[1]["verdict"] == "APPROVED", "Aditi National Strategy Review is an exact-match fixture"
    for r in results:
        assert set(r.keys()) == {"title", "verdict", "verdictScore", "topClash", "ruleViolations"}
        assert r["verdict"] in ("APPROVED", "MANUAL_REVIEW", "REJECTED")


def test_deterministic_across_repeated_calls():
    client = FixtureVerifyClient()
    a = client.verify_batch(["Some Arbitrary Title"])
    b = client.verify_batch(["Some Arbitrary Title"])
    assert a == b, "same title must get the same fixture every time — tests must be repeatable"


def test_batch_of_18_produces_some_rejections():
    # Mirrors the real Generator's batch size (Prompt 3: 18 candidates) —
    # confirms the retry loop actually has something to react to.
    client = FixtureVerifyClient()
    titles = [f"Generated Candidate Title Number {i}" for i in range(18)]
    results = client.verify_batch(titles)
    verdicts = [r["verdict"] for r in results]
    assert "REJECTED" in verdicts, "hash-bucketed fixtures should produce at least one REJECTED in 18"
    assert "APPROVED" in verdicts or "MANUAL_REVIEW" in verdicts


if __name__ == "__main__":
    checks = [
        ("exact-match titles return curated verdicts", test_exact_match_titles_return_curated_verdicts),
        ("deterministic across repeated calls", test_deterministic_across_repeated_calls),
        ("batch of 18 produces some rejections", test_batch_of_18_produces_some_rejections),
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
    print(f"\n{passed} passed, {failed} failed")

    print("\n--- verify_batch(['Times India', 'Aditi National Strategy Review']) ---")
    import json
    client = FixtureVerifyClient()
    results = client.verify_batch(["Times India", "Aditi National Strategy Review"])
    print(json.dumps(results, indent=2))

    raise SystemExit(1 if failed else 0)
