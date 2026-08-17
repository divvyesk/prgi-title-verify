"""
Proves the whole graph survives a dead network — the actual acceptance
test Prompt 4 asks for: "run the whole graph with the network disabled and
show me it still returns 5 ranked candidates."

Points the Groq client at an unreachable address (nothing listens on
127.0.0.1:1) so every real network call fails at the transport layer with
a genuine connection error — not a mocked/simulated failure. This exercises
the ACTUAL exception paths in agents/nodes/{interviewer,generator,ranker}.py,
which is what caught a real gap during development: the interviewer node
had no fallback at all, and a dead network crashed the whole graph one step
in, before the generator's offline path (agents/fallback.py) ever got a
chance to run.

Run:
    backend/.venv/bin/python agents/test_offline.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import agents.config  # noqa: F401 — loads agents/.env
import agents.llm as llm_module
from groq import Groq


def test_graph_survives_dead_network_and_returns_5_candidates():
    original_client = llm_module._client
    llm_module._client = Groq(base_url="http://127.0.0.1:1/", api_key="unreachable-on-purpose")
    try:
        from agents.graph import build_graph

        g = build_graph()
        final_state = g.invoke({
            "details": {"genre": "Tabloid weekly", "state": "Kerala", "language": "Malayalam", "tone": "populist", "audience": "youth"},
            "brief": "", "candidates": [], "verified": [], "rejected": [], "attempt": 0,
        })
        assert len(final_state["verified"]) == 5, f"expected 5 ranked candidates, got {len(final_state['verified'])}"
        for c in final_state["verified"]:
            assert set(c.keys()) == {"id", "title", "meaning", "uniquenessScore", "verificationPassed", "riskScore", "category", "rationale"}
            assert c["verificationPassed"] is True
            assert c["title"].strip()
        return final_state["verified"]
    finally:
        llm_module._client = original_client


if __name__ == "__main__":
    try:
        candidates = test_graph_survives_dead_network_and_returns_5_candidates()
        print("[PASS] graph survives a dead network, returns 5 ranked candidates")
        print()
        for c in candidates:
            print(f"  {c['title']} — {c['rationale']}")
        raise SystemExit(0)
    except AssertionError as e:
        print(f"[FAIL] {e}")
        raise SystemExit(1)
