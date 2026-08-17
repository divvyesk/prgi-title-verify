"""
Verifier node — no LLM call, no creativity. Sends every candidate through
the REAL verification pipeline in ONE batch call, never a loop: 18
sequential round trips would take far longer than one batched request and
blow the performance budget (see contracts/algo.py-style reasoning
throughout this codebase — batch over loop, always, when the API allows it).

"Real verification pipeline" means whatever VerifyClient is currently
configured (agents/clients.py) — FixtureVerifyClient while
AGENTS_USE_FIXTURES=1 (the default, for offline development),
HttpVerifyClient otherwise, as of Prompt 6. This file never simplifies
that check itself: a suggested title that only passed a cheaper "quick
check" would make the whole feature's guarantee ("every candidate is
verified by the same engine that verifies an applicant's own title")
worthless.
"""

from __future__ import annotations

from agents.clients import FixtureVerifyClient, HttpVerifyClient, VerifyClient
from agents.config import settings
from agents.state import StudioState


def _build_default_client() -> VerifyClient:
    if settings.use_fixtures:
        return FixtureVerifyClient()
    return HttpVerifyClient(settings.backend_base_url)


_default_client: VerifyClient = _build_default_client()


def _reason_for_rejection(result: dict) -> str:
    if result["topClash"]:
        return f"clashed with \"{result['topClash']['title']}\" ({result['topClash']['similarity']:.0f}% similarity)"
    if result["ruleViolations"]:
        return f"violated rule {result['ruleViolations'][0]['ruleId']}"
    return f"verdict={result['verdict']}"


def verifier_node(state: StudioState, client: VerifyClient | None = None) -> dict:
    verify_client = client or _default_client
    results = verify_client.verify_batch(state["candidates"])
    verified = [r for r in results if r["verdict"] == "APPROVED"]
    rejected = [
        {"title": r["title"], "reason": _reason_for_rejection(r)}
        for r in results
        if r["verdict"] != "APPROVED"
    ]
    return {"verified": verified, "rejected": rejected, "attempt": state.get("attempt", 0) + 1}
