"""
Tests for agents/graph.py. No LLM, no backend, no network.

Run:
    backend/.venv/bin/python agents/test_graph.py
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import agents.nodes.verifier as verifier_module
from agents.config import settings
from agents.graph import build_graph


class _AlwaysRejectClient:
    """Every candidate fails, no matter what — the worst case the retry
    bound has to survive."""

    def verify_batch(self, titles: list[str]) -> list[dict]:
        return [
            {
                "title": t,
                "verdict": "REJECTED",
                "verdictScore": 95.0,
                "topClash": {"title": "Some Existing Title", "similarity": 95.0},
                "ruleViolations": [],
            }
            for t in titles
        ]


def test_terminates_when_verifier_rejects_everything():
    """The graph must not loop forever even in the worst case. Proven by
    actually running it with a client that always rejects, under a wall-
    clock timeout — a real assertion, not just trusting the attempt bound
    logic by inspection."""
    original_client = verifier_module._default_client
    verifier_module._default_client = _AlwaysRejectClient()
    try:
        g = build_graph()
        t0 = time.time()
        final_state = g.invoke({
            "details": {"genre": "test", "state": "Test", "language": "English", "tone": "neutral"},
            "brief": "",
            "candidates": [],
            "verified": [],
            "rejected": [],
            "attempt": 0,
        })
        elapsed = time.time() - t0
        # 60s, not 10s: as of Prompt 3 the generator makes a REAL LLM call
        # per attempt (interviewer + generator), and this test forces all
        # max_attempts=3 retries. This bound is about proving the graph
        # terminates at all (doesn't hang past a fallback chain exhausting
        # all 4 models 3 times over), not about being fast — the actual
        # performance target belongs to Prompt 6's live-backend timing.
        assert elapsed < 60, f"graph should terminate within a bounded time, took {elapsed:.1f}s"
        assert final_state["attempt"] == settings.max_attempts, (
            f"should stop exactly at max_attempts={settings.max_attempts}, got {final_state['attempt']}"
        )
        assert final_state["verified"] == [], "always-reject client should leave verified empty"
        assert len(final_state["rejected"]) == 18, "the last attempt's 18 candidates should all be recorded as rejected"
    finally:
        verifier_module._default_client = original_client


def test_normal_run_reaches_ranker_with_survivors():
    g = build_graph()
    final_state = g.invoke({
        "details": {"genre": "Regional daily", "state": "Maharashtra", "language": "Marathi", "tone": "formal"},
        "brief": "",
        "candidates": [],
        "verified": [],
        "rejected": [],
        "attempt": 0,
    })
    assert 0 < len(final_state["verified"]) <= settings.target_survivors
    assert final_state["attempt"] >= 1


if __name__ == "__main__":
    checks = [
        ("terminates when verifier rejects everything", test_terminates_when_verifier_rejects_everything),
        ("normal run reaches ranker with survivors", test_normal_run_reaches_ranker_with_survivors),
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

    print("\n--- full run, state printed after every node ---")
    g = build_graph()
    state = {
        "details": {"genre": "Regional daily", "state": "Maharashtra", "language": "Marathi", "tone": "formal"},
        "brief": "", "candidates": [], "verified": [], "rejected": [], "attempt": 0,
    }
    for event in g.stream(state, stream_mode="updates"):
        for node_name, update in event.items():
            print(f"\n[{node_name}] ->")
            for k, v in update.items():
                if isinstance(v, list) and len(v) > 3:
                    print(f"  {k}: [{len(v)} items] first 2: {v[:2]}")
                else:
                    print(f"  {k}: {v}")

    raise SystemExit(1 if failed else 0)
