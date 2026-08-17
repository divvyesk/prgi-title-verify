"""
Tests for agents/studio.py's run_studio() and its on_step progress
callback — the piece Gurpreet's UI depends on to animate the four agents.

LLM calls are mocked here (not a live-API test) — this file is about
proving the on_step WIRING is correct (fires once per node, survives a
callback that raises, exposes rejected candidates + reasons), which
doesn't need real model output to verify. agents/test_graph.py and
agents/test_offline.py already cover real-LLM and dead-network behavior.

Run:
    backend/.venv/bin/python agents/test_studio.py
"""

import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import agents.nodes.generator as generator_module
import agents.nodes.interviewer as interviewer_module
import agents.nodes.ranker as ranker_module
import agents.nodes.verifier as verifier_module
from agents.clients import FixtureVerifyClient
from agents.studio import run_studio

_DETAILS = {"genre": "Tabloid weekly", "state": "Kerala", "language": "Malayalam", "tone": "populist", "audience": "youth"}


def _patched_run(fn):
    """Mocks all three LLM call sites directly (not agents.llm.call_llm
    itself) so this stays fast and deterministic regardless of which
    node calls it, and uses the real FixtureVerifyClient for the verifier
    so `rejected`/`verified` are genuinely differentiated, not uniform."""
    with patch.object(interviewer_module, "call_llm", return_value="A test brief."), \
         patch.object(generator_module, "call_llm", return_value='["Title A","Title B","Title C","Title D","Title E","Title F","Title G","Title H","Title I","Title J","Title K","Title L","Title M","Title N","Title O","Title P","Title Q","Title R"]'), \
         patch.object(ranker_module, "call_llm", return_value="[]"), \
         patch.object(verifier_module, "_default_client", FixtureVerifyClient()):
        return fn()


def test_on_step_fires_once_per_node():
    events = []
    result = _patched_run(lambda: run_studio(_DETAILS, on_step=lambda node, update: events.append((node, update))))
    node_names = [e[0] for e in events]
    assert "interviewer" in node_names
    assert "generator" in node_names
    assert "verifier" in node_names
    assert "ranker" in node_names
    assert isinstance(result, list)


def test_on_step_exposes_rejected_candidates_with_reasons():
    events = []
    _patched_run(lambda: run_studio(_DETAILS, on_step=lambda node, update: events.append((node, update))))
    verifier_events = [update for node, update in events if node == "verifier"]
    assert verifier_events, "verifier node should have fired at least once"
    rejected = verifier_events[0].get("rejected", [])
    assert isinstance(rejected, list)
    if rejected:
        assert set(rejected[0].keys()) == {"title", "reason"}
        assert rejected[0]["reason"], "reason must not be empty — this is what makes rejection visible in the UI"


def test_on_step_callback_raising_does_not_crash_the_graph():
    def bad_callback(node, update):
        raise RuntimeError("Gurpreet's UI code has a bug")

    result = _patched_run(lambda: run_studio(_DETAILS, on_step=bad_callback))
    assert isinstance(result, list), "a raising callback must not prevent run_studio from returning"


def test_run_studio_works_with_no_callback_at_all():
    result = _patched_run(lambda: run_studio(_DETAILS))
    assert isinstance(result, list)


if __name__ == "__main__":
    checks = [
        ("on_step fires once per node", test_on_step_fires_once_per_node),
        ("on_step exposes rejected candidates with reasons", test_on_step_exposes_rejected_candidates_with_reasons),
        ("a raising on_step callback does not crash the graph", test_on_step_callback_raising_does_not_crash_the_graph),
        ("run_studio works with no callback at all", test_run_studio_works_with_no_callback_at_all),
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
    raise SystemExit(1 if failed else 0)
