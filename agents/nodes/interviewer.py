"""
Interviewer node — real LLM call, temperature 0.2. Low temperature because
this step must be consistent (the same publication details should produce
essentially the same brief every time), not creative — creativity is the
Generator's job, one step later.

Falls back to a templated brief (no LLM) if the call fails. This matters
more than it looks: the Interviewer is the FIRST node in the graph — with
no fallback here, a dead network crashes the whole graph before the
Generator's own offline fallback (agents/fallback.py) ever gets a chance to
run. Verified live: disconnecting the LLM client entirely and running the
graph end to end raised an unhandled RuntimeError out of this node before
this fallback was added.
"""

from __future__ import annotations

import logging

from agents.config import settings
from agents.llm import call_llm
from agents.state import StudioState

logger = logging.getLogger("agents.nodes.interviewer")

_PROMPT = """You are writing a short creative brief for a naming agency, to guide \
the invention of a periodical (newspaper/magazine) title.

Publication details:
- Genre: {genre}
- Target state: {state}
- Language: {language}
- Tone: {tone}
- Audience: {audience}

Write a brief of exactly 3 to 4 sentences describing what the title should \
evoke. Name the region's cultural references specifically (do not write \
generically about "the region" — name real places, landmarks, or cultural \
touchstones relevant to {state}). State the register explicitly: formal, \
populist, or literary. Do not suggest any actual titles — this brief is \
input to a separate step that invents titles.

Reply with ONLY the brief text, no heading, no preamble."""


def _fallback_brief(details: dict) -> str:
    """No LLM — plain string formatting. Good enough to keep the graph
    moving; the Generator's own prompt (agents/nodes/generator.py) still
    carries the real state/language/genre and 8-10 real local titles
    regardless of whether this brief came from an LLM or this template."""
    tone = details.get("tone") or "neutral"
    return (
        f"A {tone}-toned {details.get('genre', 'periodical')} for "
        f"{details.get('state', 'India')}, in {details.get('language', 'English')}, "
        f"aimed at {details.get('audience') or 'a general readership'}."
    )


def interviewer_node(state: StudioState) -> dict:
    details = state["details"]
    prompt = _PROMPT.format(
        genre=details.get("genre", "periodical"),
        state=details.get("state", "India"),
        language=details.get("language", "English"),
        tone=details.get("tone") or "unspecified — choose one and name it",
        audience=details.get("audience") or "general readership",
    )
    try:
        brief = call_llm(prompt, temperature=settings.interviewer_temperature, max_tokens=400)
    except Exception:
        logger.exception("interviewer: LLM call failed entirely, falling back to a templated brief")
        brief = _fallback_brief(details)
    return {"brief": brief}
