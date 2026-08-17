"""
The four-agent LangGraph workflow.

LangGraph models an AI workflow as a graph of named nodes connected by
edges, with a shared state (StudioState) passed along and updated by each
node. Chosen over CrewAI/AutoGen because this workflow is a FIXED four-step
sequence with exactly one retry loop — we want predictable, inspectable
execution, not open-ended agent conversation. Every node is a plain
function of (state) -> partial state update; LangGraph merges the update
into the running state and moves to the next node per the edges below.

    interviewer -> generator -> verifier --[enough_survived?]--> ranker -> END
                       ^                        |
                       +---------- "no" --------+

interviewer/generator are real as of Prompt 3 — real LLM calls via
agents/llm.py (agents/nodes/interviewer.py, agents/nodes/generator.py).
Prompt 4 replaces verifier/ranker (agents/nodes/verifier.py,
agents/nodes/ranker.py) and adds the offline fallback. The graph SHAPE —
nodes, edges, the retry condition — does not change across those prompts.
"""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from agents.clients import FixtureVerifyClient
from agents.config import settings
from agents.nodes.generator import generator_node
from agents.nodes.interviewer import interviewer_node
from agents.state import StudioState

_verify_client = FixtureVerifyClient()


def verifier_node(state: StudioState) -> dict:
    """STUB in the sense that it always uses FixtureVerifyClient (Prompt 6
    swaps in HttpVerifyClient) — but the split/attempt-increment logic
    here is the real logic, not a placeholder."""
    results = _verify_client.verify_batch(state["candidates"])
    verified = [r for r in results if r["verdict"] == "APPROVED"]
    rejected = [
        {
            "title": r["title"],
            "reason": (
                f"clashed with \"{r['topClash']['title']}\" ({r['topClash']['similarity']:.0f}% similarity)"
                if r["topClash"]
                else (
                    f"violated rule {r['ruleViolations'][0]['ruleId']}"
                    if r["ruleViolations"]
                    else f"verdict={r['verdict']}"
                )
            ),
        }
        for r in results
        if r["verdict"] != "APPROVED"
    ]
    return {"verified": verified, "rejected": rejected, "attempt": state.get("attempt", 0) + 1}


def ranker_node(state: StudioState) -> dict:
    """STUB (Prompt 2): sorts and truncates only. Real version (Prompt 4):
    an LLM call adds a one-line rationale and (for non-English titles) a
    meaning field per survivor, producing contracts.GeneratedCandidate
    objects."""
    ranked = sorted(state["verified"], key=lambda r: r["verdictScore"])[:settings.target_survivors]
    return {"verified": ranked}


def enough_survived(state: StudioState) -> str:
    """The only branch point in the graph. Returns "no" (retry the
    Generator) ONLY while both conditions hold: fewer than target_survivors
    have survived AND there are attempts left. The attempt bound is what
    makes it impossible for this graph to loop forever — even a Verifier
    that rejects literally everything terminates after max_attempts
    passes through the retry edge."""
    if len(state["verified"]) >= settings.target_survivors:
        return "yes"
    if state.get("attempt", 0) >= settings.max_attempts:
        return "yes"  # give up rather than loop forever — ranker returns whatever survived
    return "no"


def build_graph():
    builder = StateGraph(StudioState)
    builder.add_node("interviewer", interviewer_node)
    builder.add_node("generator", generator_node)
    builder.add_node("verifier", verifier_node)
    builder.add_node("ranker", ranker_node)

    builder.set_entry_point("interviewer")
    builder.add_edge("interviewer", "generator")
    builder.add_edge("generator", "verifier")
    builder.add_conditional_edges("verifier", enough_survived, {"yes": "ranker", "no": "generator"})
    builder.add_edge("ranker", END)

    return builder.compile()


GRAPH = build_graph()
