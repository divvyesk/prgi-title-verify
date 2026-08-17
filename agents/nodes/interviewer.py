"""
Interviewer node — real LLM call, temperature 0.2. Low temperature because
this step must be consistent (the same publication details should produce
essentially the same brief every time), not creative — creativity is the
Generator's job, one step later.
"""

from __future__ import annotations

from agents.config import settings
from agents.llm import call_llm
from agents.state import StudioState

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


def interviewer_node(state: StudioState) -> dict:
    details = state["details"]
    prompt = _PROMPT.format(
        genre=details.get("genre", "periodical"),
        state=details.get("state", "India"),
        language=details.get("language", "English"),
        tone=details.get("tone") or "unspecified — choose one and name it",
        audience=details.get("audience") or "general readership",
    )
    brief = call_llm(prompt, temperature=settings.interviewer_temperature, max_tokens=400)
    return {"brief": brief}
