"""
RAG explainer with a hallucination guard. RAG means: first FIND the real
source text, then ask the model to phrase only that text. The model never
answers from memory, so it cannot invent a clause that does not exist —
this ordering is the entire reason the feature exists. A fabricated legal
citation in a compliance product is a serious defect, not a rough edge.

Public interface matches what backend/app/services/pipeline.py already
expects (dynamic-import wiring point, see that file and AGENTS.md's
"MY ROLE (Suhani)" section) and mirrors
backend/app/services/stub.py's template_explanation() exactly, so it's a
drop-in swap for the templated version pipeline.py falls back to:

    explain(title, verdict, clashing_titles, rule_violations)
        -> (explanation: str, recommended_action: str, guideline_citations: list[str])

`clashing_titles` / `rule_violations` are the real contracts.contracts
ClashingTitle / RuleViolation objects when called from the pipeline —
accessed here as attributes (`.title`, `.rule_id`, ...), matching how
Pydantic model instances actually work, not as dicts.
"""

from __future__ import annotations

import logging

from agents.config import settings
from agents.llm import call_llm
from ml.rag.retrieve import vector_search

logger = logging.getLogger("ml.rag.explain")

_guard_stats = {"calls": 0, "guard_fired": 0}


def get_guard_stats() -> dict:
    """For the presentation (Prompt 7 of this pack): 'log every time it
    fires — I want the rate, because it goes on the presentation as
    evidence we measured our own hallucination risk.'"""
    calls = _guard_stats["calls"]
    rate = (_guard_stats["guard_fired"] / calls) if calls else 0.0
    return {"calls": calls, "guard_fired": _guard_stats["guard_fired"], "guard_fire_rate": round(rate, 4)}


_EXPLAIN_PROMPT = """You are explaining a title-verification decision to a PRGI (Press \
Registrar General of India) applicant in plain language.

Proposed title: "{title}"
Verdict: {verdict}
Triggered rules: {rules}
Top conflicting registered title: {clash}

Retrieved guideline text (this is the ONLY source you may cite from):
{retrieved}

Write at most two sentences explaining the decision, in plain language a \
non-lawyer understands. Use ONLY the retrieved text above — do not add any \
rule, clause, or citation that is not in it. If you reference a rule, \
quote its clause reference exactly as shown in the retrieved text (e.g. \
"R-GEN-01"). Reply with ONLY the explanation text, no heading, no preamble."""


def _format_rules(rule_violations: list) -> str:
    if not rule_violations:
        return "(none)"
    return "; ".join(f"{v.rule_id} ({v.rule_name})" for v in rule_violations)


def _format_clash(clash) -> str:
    if clash is None:
        return "(none)"
    return f"\"{clash.title}\" ({clash.similarity:.0f}% similarity, {clash.match_type})"


def _fallback_verbatim(title: str, verdict: str, chunks: list[dict]) -> str:
    """Zero LLM involvement — just the retrieved text itself, verbatim.
    Used both when the guard fires (model cited something not retrieved)
    and when the LLM call fails outright. Never wrong in the way a
    paraphrase can be wrong, because nothing is paraphrased."""
    if not chunks:
        return f"Title \"{title}\" received verdict {verdict}. No matching guideline text was found to cite."
    quotes = "; ".join(f"[{c['rule_id']}] {c['source_clause']}" for c in chunks)
    return f"Title \"{title}\" received verdict {verdict} per: {quotes}"


def _recommended_action(verdict: str, rule_violations: list) -> str:
    if verdict == "REJECTED" and rule_violations:
        return "Remove the restricted terms before resubmitting, or use the Agentic Title Studio to generate distinctive, pre-verified alternatives."
    if verdict == "REJECTED":
        return "Try a substantially different title, or use the Agentic Title Studio to generate distinctive alternatives."
    if verdict == "MANUAL_REVIEW":
        return "Consider adding an authorized geographic prefix or distinctive institutional qualifier."
    return "Proceed with Aadhaar e-Sign filing on the Press Sewa Portal."


def explain(title: str, verdict: str, clashing_titles: list, rule_violations: list) -> tuple[str, str, list[str]]:
    if verdict == "APPROVED":
        return (
            f"Title \"{title}\" is distinct and fully compliant. No conflicting registered "
            "titles found within the similarity threshold, and all PRGI statutory rules passed.",
            _recommended_action(verdict, rule_violations),
            [],
        )

    query_parts = [v.rule_name for v in rule_violations] + [c.match_type for c in clashing_titles[:1]]
    chunks = vector_search(" ".join(query_parts) or verdict, k=3)

    top_clash = clashing_titles[0] if clashing_titles else None
    prompt = _EXPLAIN_PROMPT.format(
        title=title,
        verdict=verdict,
        rules=_format_rules(rule_violations),
        clash=_format_clash(top_clash),
        retrieved="\n\n".join(f"[{c['rule_id']}] {c['retrieval_chunk']}" for c in chunks) or "(no matching guideline text retrieved)",
    )

    _guard_stats["calls"] += 1
    try:
        raw = call_llm(prompt, temperature=settings.explain_temperature, max_tokens=500)
    except Exception:
        logger.exception("ml.rag.explain: LLM call failed entirely, falling back to verbatim retrieved text")
        explanation = _fallback_verbatim(title, verdict, chunks)
    else:
        allowed_ids = {c["rule_id"] for c in chunks if c.get("rule_id")}
        guard_fired = bool(allowed_ids) and not any(rid in raw for rid in allowed_ids)
        if guard_fired:
            _guard_stats["guard_fired"] += 1
            logger.warning(
                "ml.rag.explain: hallucination guard FIRED — model output cited no chunk in %s, falling back to verbatim. rate so far: %s",
                sorted(allowed_ids), get_guard_stats(),
            )
            explanation = _fallback_verbatim(title, verdict, chunks)
        else:
            explanation = raw

    citations = [c["source_clause"] for c in chunks] if chunks else ["No matching guideline text retrieved."]
    return explanation, _recommended_action(verdict, rule_violations), citations
