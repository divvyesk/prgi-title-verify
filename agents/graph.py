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

All four nodes are real as of Prompt 4 — real LLM calls via agents/llm.py
for interviewer/generator/ranker (agents/nodes/*.py), and the verifier
against whatever VerifyClient is currently configured (agents/clients.py:
FixtureVerifyClient today, HttpVerifyClient from Prompt 6 onward). The
graph SHAPE — nodes, edges, the retry condition — has not changed since
Prompt 2.
"""

from __future__ import annotations

from langgraph.graph import END, StateGraph

from agents.config import settings
from agents.nodes.generator import generator_node
from agents.nodes.interviewer import interviewer_node
from agents.nodes.ranker import ranker_node
from agents.nodes.verifier import verifier_node
from agents.state import StudioState


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
