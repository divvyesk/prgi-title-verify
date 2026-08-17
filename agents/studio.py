"""
The one public entry point Divvye's backend calls
(backend/app/routers/alternatives.py: `from agents.studio import run_studio`).
Also re-exported from agents/__init__.py as `from agents import run_studio`,
so both import styles work.

Real as of Prompt 6 — runs the compiled graph (agents/graph.py) end to end
and returns its ranked survivors, which are already GeneratedCandidate-
shaped dicts (agents/nodes/ranker.py).
"""

from __future__ import annotations

import logging
from typing import Callable

from agents.graph import GRAPH
from agents.state import StudioState

logger = logging.getLogger("agents.studio")


def run_studio(details: dict, on_step: Callable[[str, dict], None] | None = None) -> list[dict]:
    """Gurpreet's progress callback: on_step(node_name, state_delta), called
    once per node as it completes — for the verifier node, state_delta
    includes `rejected` (title + reason for each), which is what makes
    "watching the Verifier reject candidates and send them back" visible in
    the UI, per this prompt's own framing of it as the most impressive part
    of the feature. A callback that raises is logged and skipped rather
    than allowed to crash the graph — Gurpreet's UI code being buggy on a
    given render must never take down title generation."""
    initial_state: StudioState = {
        "details": details,
        "brief": "",
        "candidates": [],
        "verified": [],
        "rejected": [],
        "attempt": 0,
    }

    final_verified: list[dict] = []
    for event in GRAPH.stream(initial_state, stream_mode="updates"):
        for node_name, update in event.items():
            if "verified" in update:
                final_verified = update["verified"]
            if on_step is not None:
                try:
                    on_step(node_name, update)
                except Exception:
                    logger.exception("run_studio: on_step callback raised for node %r — continuing", node_name)

    return final_verified
