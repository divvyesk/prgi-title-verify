"""
Tests for agents/fallback.py. Needs no network, no API key — this file
existing and passing IS the proof the offline path works.

Run:
    backend/.venv/bin/python agents/test_fallback.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.fallback import generate_offline_candidates

_DETAILS = {"genre": "Regional daily", "state": "Maharashtra", "language": "Marathi"}


def test_produces_18_unique_nonempty_candidates():
    candidates = generate_offline_candidates(_DETAILS, attempt=0)
    assert len(candidates) == 18
    assert len(set(candidates)) == 18, "must be unique — duplicates waste a Verifier slot"
    assert all(c.strip() for c in candidates)


def test_deterministic_for_same_details_and_attempt():
    a = generate_offline_candidates(_DETAILS, attempt=0)
    b = generate_offline_candidates(_DETAILS, attempt=0)
    assert a == b


def test_different_attempts_produce_different_candidates():
    a = generate_offline_candidates(_DETAILS, attempt=0)
    b = generate_offline_candidates(_DETAILS, attempt=1)
    assert a != b, "a retry that reproduces the exact same rejected batch is pointless"


def test_different_details_produce_different_candidates():
    a = generate_offline_candidates(_DETAILS, attempt=0)
    b = generate_offline_candidates({"genre": "Tabloid", "state": "Kerala", "language": "Malayalam"}, attempt=0)
    assert a != b


if __name__ == "__main__":
    checks = [
        ("produces 18 unique non-empty candidates", test_produces_18_unique_nonempty_candidates),
        ("deterministic for same details+attempt", test_deterministic_for_same_details_and_attempt),
        ("different attempts differ", test_different_attempts_produce_different_candidates),
        ("different details differ", test_different_details_produce_different_candidates),
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
    raise SystemExit(1 if failed else 0)
