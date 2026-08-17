"""
The one public entry point Divvye's backend calls
(backend/app/routers/alternatives.py: `from agents.studio import run_studio`).
Also re-exported from agents/__init__.py as `from agents import run_studio`,
so both import styles work.

Placeholder today (Prompt 1 — scaffold only). Prompt 2 builds the LangGraph
workflow this function will actually run; Prompt 6 is what makes it call
the real graph end-to-end with a progress callback and swap in
HttpVerifyClient. Until then this raises clearly rather than silently
returning nothing, so nothing accidentally ships thinking this works.
"""

from __future__ import annotations

from typing import Callable


def run_studio(details: dict, on_step: Callable[[str, dict], None] | None = None) -> list[dict]:
    raise NotImplementedError(
        "run_studio is scaffolded in Prompt 1 but not built yet — the graph "
        "lands in Prompt 2, the real wiring (progress callback, live backend) "
        "in Prompt 6. backend/app/routers/alternatives.py already falls back "
        "to fixture data gracefully when this raises, so this is safe to ship "
        "mid-build."
    )
