"""The shared state LangGraph threads through all four nodes."""

from __future__ import annotations

from typing import TypedDict


class StudioState(TypedDict):
    details: dict  # genre, region, state, language, tone, audience
    brief: str
    candidates: list[str]
    verified: list[dict]  # survived — verify_batch dicts, see agents/clients.py
    rejected: list[dict]  # title + why it failed; feeds the retry prompt
    attempt: int
