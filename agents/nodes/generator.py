"""
Generator node — real LLM call, temperature 0.85. This is the one step
that should actually be creative; every other node is deliberately low-
temperature and consistent.

Showing the model 8-10 REAL registered titles from the same state and
language is what makes output culturally resonant instead of generic
filler like "Daily Voice" and "News Today" — the model has authentic local
naming patterns to draw from, not just an abstract instruction.
"""

from __future__ import annotations

import csv
import json
import logging
import random
import re
import zlib
from pathlib import Path

from agents.config import settings
from agents.llm import call_llm
from agents.state import StudioState

logger = logging.getLogger("agents.nodes.generator")

REPO_ROOT = Path(__file__).resolve().parents[2]
TITLE_MASTER_CSV = REPO_ROOT / "data" / "datasets" / "dataset1" / "data" / "processed" / "title_master.csv"

_ALL_ROWS_CACHE: list[dict] | None = None


def _load_all_rows() -> list[dict]:
    """Reads title_master.csv once, ever, no matter how many times
    sample_local_titles() is called — 82,713 rows is too much to re-parse
    per node invocation, let alone per retry attempt."""
    global _ALL_ROWS_CACHE
    if _ALL_ROWS_CACHE is None:
        with open(TITLE_MASTER_CSV, encoding="utf-8", newline="") as f:
            _ALL_ROWS_CACHE = [r for r in csv.DictReader(f) if r["data_quality_status"] == "VALID"]
    return _ALL_ROWS_CACHE


def sample_local_titles(state: str, language: str, n: int = 10) -> list[str]:
    """Real titles matching state+language; degrades gracefully (state-only,
    then language-only, then any real titles) rather than returning nothing
    for an obscure combination not well-represented in the dataset —
    SOME real examples beat none, even if not a perfect match."""
    rows = _load_all_rows()
    state_l, language_l = state.lower(), language.lower()

    def matches(r: dict, need_state: bool, need_language: bool) -> bool:
        ok = True
        if need_state:
            ok = ok and state_l in r["Publication State"].lower()
        if need_language:
            ok = ok and language_l in r["Language"].lower()
        return ok

    for need_state, need_language in [(True, True), (True, False), (False, True), (False, False)]:
        pool = [r["Title"].strip() for r in rows if matches(r, need_state, need_language)]
        if pool:
            # Python's built-in hash() is randomized per process for str/tuple
            # (security feature, PYTHONHASHSEED) — seeding with it would make
            # this sample different every restart despite looking pinned.
            # zlib.crc32 is stable across runs, matching the same pattern used
            # elsewhere in this codebase (backend/app/services/stub.py) for
            # exactly this reason.
            seed = zlib.crc32(f"{state_l}:{language_l}".encode("utf-8"))
            rnd = random.Random(seed)
            return rnd.sample(pool, min(n, len(pool)))
    return []  # only reachable if the whole dataset is somehow empty


_JSON_ARRAY = re.compile(r"\[.*\]", re.DOTALL)


def _parse_candidates(raw: str) -> list[str]:
    """Defensive parsing: ask for JSON, but never let a formatting hiccup
    crash the graph. Three fallback levels, each strictly weaker than the
    last."""
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
            return [x.strip() for x in parsed if x.strip()]
    except json.JSONDecodeError:
        pass

    match = _JSON_ARRAY.search(raw)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
                return [x.strip() for x in parsed if x.strip()]
        except json.JSONDecodeError:
            pass

    logger.warning("generator: model did not return valid JSON, falling back to line-splitting")
    lines = []
    for line in raw.splitlines():
        line = line.strip().strip('"').strip("'")
        line = re.sub(r"^[-*\d.)\s]+", "", line).strip()  # strip bullet/number prefixes
        if line:
            lines.append(line)
    return lines


_PROMPT = """You are inventing periodical (newspaper/magazine) titles for a naming agency.

Creative brief:
{brief}

Here are real, currently-registered titles from the same state and language, \
for authentic regional flavor (do NOT copy these — use them only to understand \
local naming conventions):
{local_titles}

Propose exactly 18 candidate titles. Reply with ONLY a JSON array of 18 strings, \
nothing else — no heading, no numbering, no explanation.
{retry_block}"""

_RETRY_BLOCK = """
IMPORTANT — this is a retry. These titles were already rejected, with the \
reason each failed:
{rejected_list}
Do NOT repeat these titles or similar patterns. Propose meaningfully \
different candidates this time."""


def generator_node(state: StudioState) -> dict:
    details = state["details"]
    local_titles = sample_local_titles(details.get("state", ""), details.get("language", ""), n=10)
    local_titles_block = "\n".join(f"- {t}" for t in local_titles) if local_titles else "(none found for this state/language)"

    retry_block = ""
    if state.get("attempt", 0) > 0 and state.get("rejected"):
        rejected_list = "\n".join(f"- \"{r['title']}\" — {r['reason']}" for r in state["rejected"])
        retry_block = _RETRY_BLOCK.format(rejected_list=rejected_list)

    prompt = _PROMPT.format(brief=state["brief"], local_titles=local_titles_block, retry_block=retry_block)
    # 2048, not 1024: verified live that 18 titles in a non-Latin script
    # (e.g. Devanagari for Marathi) plus a model's internal reasoning trace
    # (see agents/llm.py) can exhaust a 1024 budget before any JSON comes
    # out, forcing an avoidable fallback to a weaker model on every call.
    raw = call_llm(prompt, temperature=settings.generator_temperature, max_tokens=2048)
    candidates = _parse_candidates(raw)
    return {"candidates": candidates}
