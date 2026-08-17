"""
Retrieval for the RAG explainer — the "find the real source text" half of
"first FIND, then phrase." Tries real sources in order; only the last one
(ml/rag/placeholder_chunks.py) is Suhani's own temporary data.

Today, "vector_search" is not actually a vector search: no pgvector-backed
guideline_chunks table and no guideline embeddings exist yet (Pruthviraj's
ml/embeddings/generate.py is still empty — checked directly). What's here
instead is keyword-overlap ranking over whatever chunk corpus is currently
available, which is honest about being a placeholder ranking algorithm
over placeholder-until-real data, not a silent approximation dressed up as
the real thing. Swapping in real pgvector search later only touches
_load_chunks() and rank() — explain.py's contract (call retrieve(), get
back a ranked list of chunk dicts) does not change.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from ml.rag.placeholder_chunks import PLACEHOLDER_CHUNKS

logger = logging.getLogger("ml.rag.retrieve")

REPO_ROOT = Path(__file__).resolve().parents[2]
RULES_SEED_PATH = REPO_ROOT / "contracts" / "fixtures" / "rules_seed.json"

_chunks_cache: list[dict] | None = None
_STOPWORDS = {"the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by", "is", "shall", "not", "be"}


def _load_chunks() -> list[dict]:
    global _chunks_cache
    if _chunks_cache is not None:
        return _chunks_cache

    if RULES_SEED_PATH.exists():
        try:
            data = json.loads(RULES_SEED_PATH.read_text(encoding="utf-8"))
            if isinstance(data, list) and data:
                logger.info("ml.rag.retrieve: loaded %d real rule chunks from %s", len(data), RULES_SEED_PATH)
                _chunks_cache = data
                return _chunks_cache
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("ml.rag.retrieve: %s exists but unreadable (%s), falling back", RULES_SEED_PATH, exc)

    logger.warning(
        "ml.rag.retrieve: no real rules_seed.json/guideline_chunks table found — "
        "using ml/rag/placeholder_chunks.py (source_clause_verified=False for everything in it)"
    )
    _chunks_cache = PLACEHOLDER_CHUNKS
    return _chunks_cache


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z]+", text.lower())
    return {w for w in words if w not in _STOPWORDS and len(w) > 2}


def vector_search(query: str, k: int = 3) -> list[dict]:
    """Ranks the available chunk corpus by keyword overlap with `query`
    (see module docstring re: this standing in for real pgvector search).
    Returns the top k, each augmented with a `_score` field. Never raises:
    an empty or all-zero-overlap query returns an empty list rather than
    an arbitrary top-k, since a chunk with zero relation to the query is
    worse than no retrieved context at all."""
    try:
        query_words = _tokenize(query)
        if not query_words:
            return []
        scored = []
        for chunk in _load_chunks():
            chunk_words = _tokenize(chunk.get("retrieval_chunk", "") + " " + chunk.get("rule_name", ""))
            overlap = len(query_words & chunk_words)
            if overlap > 0:
                scored.append((overlap, chunk))
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [{**chunk, "_score": score} for score, chunk in scored[:k]]
    except Exception:
        logger.exception("ml.rag.retrieve.vector_search failed, returning no context")
        return []
