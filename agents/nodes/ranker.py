"""
Ranker node — real LLM call, temperature 0.2 (consistent, not creative —
same reasoning as the Interviewer). Sorts survivors, then asks the model
for a one-line rationale (and, for non-English titles, a plain-language
meaning) per survivor in ONE batched call rather than one call per title.

Returns dicts shaped exactly like contracts.contracts.GeneratedCandidate
(camelCase, matching the wire format) — this is the final output shape
`agents.studio.run_studio()` (Prompt 6) hands back to
backend/app/routers/alternatives.py.
"""

from __future__ import annotations

import json
import logging
import re

from agents.config import settings
from agents.llm import call_llm
from agents.state import StudioState

logger = logging.getLogger("agents.nodes.ranker")

_JSON_ARRAY = re.compile(r"\[.*\]", re.DOTALL)

_PROMPT = """For each title below, write a one-line rationale (why it works as a \
periodical title for this brief) and, ONLY if the title is not in English, a \
short plain-English "meaning" explaining what it evokes. For English titles, \
meaning must be an empty string.

Brief: {brief}

Titles:
{titles_block}

Reply with ONLY a JSON array, one object per title in the same order, each \
shaped exactly like:
{{"title": "...", "rationale": "...", "meaning": "..."}}
No heading, no numbering, no explanation outside the JSON."""


def _parse_annotations(raw: str, titles: list[str]) -> dict[str, dict]:
    """Returns {title: {"rationale": str, "meaning": str}}. Defensive same
    as the Generator's parser — a formatting hiccup here must not crash
    the graph on its very last step."""
    candidates_json = None
    try:
        candidates_json = json.loads(raw)
    except json.JSONDecodeError:
        match = _JSON_ARRAY.search(raw)
        if match:
            try:
                candidates_json = json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

    result = {}
    if isinstance(candidates_json, list):
        for item in candidates_json:
            if isinstance(item, dict) and "title" in item:
                result[item["title"]] = {
                    "rationale": str(item.get("rationale", "")).strip(),
                    "meaning": str(item.get("meaning", "")).strip(),
                }

    if len(result) < len(titles):
        logger.warning("ranker: LLM annotated %d/%d titles, filling the rest with a generic fallback", len(result), len(titles))
    return result


def _fallback_annotation() -> dict:
    return {"rationale": "Distinctive title with no significant registry conflicts detected.", "meaning": ""}


def ranker_node(state: StudioState) -> dict:
    details = state["details"]
    survivors = sorted(state["verified"], key=lambda r: r["verdictScore"])[: settings.target_survivors]
    if not survivors:
        return {"verified": []}

    titles = [s["title"] for s in survivors]
    titles_block = "\n".join(f"- {t}" for t in titles)
    prompt = _PROMPT.format(brief=state.get("brief", ""), titles_block=titles_block)

    try:
        raw = call_llm(prompt, temperature=settings.ranker_temperature, max_tokens=1024)
        annotations = _parse_annotations(raw, titles)
    except Exception:
        logger.exception("ranker: LLM call failed entirely, falling back to generic rationale for every survivor")
        annotations = {}

    ranked = []
    for i, s in enumerate(survivors, start=1):
        ann = annotations.get(s["title"], _fallback_annotation())
        ranked.append({
            "id": f"GC-{i:03d}",
            "title": s["title"],
            "meaning": ann["meaning"],
            "uniquenessScore": round(max(0.0, min(100.0, 100.0 - s["verdictScore"])), 1),
            "verificationPassed": True,
            "riskScore": s["verdictScore"],
            "category": details.get("genre", ""),
            "rationale": ann["rationale"] or _fallback_annotation()["rationale"],
        })
    return {"verified": ranked}
