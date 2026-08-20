"""
Retrieval for the RAG explainer — the "find the real source text" half of
"first FIND, then phrase." Tries real sources in order; only the last one
(ml/rag/placeholder_chunks.py) is Suhani's own temporary data.

vector_search() is now a real semantic search, ranking chunks by BGE-M3
cosine similarity rather than the keyword overlap this module started with.

That change fixes a measured retrieval failure, not a hypothetical one:
asked to explain a title containing "Police", keyword overlap ranked
R-GOV-01 (Government emblems and names) out of the top 3 entirely. The
guideline text never says "police" — it says "national symbol ... Central
Government/State Governments/Local bodies" — so the one word they share is
"government", which tied with unrelated rules and lost. Citing the wrong
clause is the single worst failure this module can have, since the whole
point of the RAG layer is that the explanation quotes the rule the title
actually broke.

The corpus is ~10 short chunks, so it is embedded once at first use and
held in memory; there is no pgvector query here. A vector index earns its
cost at corpus scale, and at ten rows it would only add a database
dependency to a path that is deliberately able to run offline.

Keyword overlap is kept as the fallback for exactly that offline case: if
the embedding model cannot be loaded, ranking degrades to the old
behaviour instead of returning nothing. explain.py's contract (call
vector_search(), get back a ranked list of chunk dicts) is unchanged.
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
_embeddings_cache = None

# Below this cosine similarity a chunk is treated as unrelated to the query.
# Tuned against the seeded corpus: real matches land ~0.5-0.7, while clearly
# unrelated rules sit well under 0.35.
_MIN_SIMILARITY = 0.35
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


def _chunk_text(chunk: dict) -> str:
    """The text a chunk is matched on. `name` carries the plain-language
    label ("Government emblems and names") that the formal clause wording
    often omits, so both go in."""
    return f"{chunk.get('name', '')}. {chunk.get('retrieval_chunk', '')}".strip()


def _get_embeddings():
    """Embed the chunk corpus once, lazily. Returns None if the model is
    unavailable (offline, or sentence-transformers not installed), which is
    the signal to fall back to keyword ranking."""
    global _embeddings_cache
    if _embeddings_cache is not None:
        return _embeddings_cache

    try:
        from ml.similarity.semantic import get_model

        model = get_model()
        chunks = _load_chunks()
        vectors = model.encode(
            [_chunk_text(c) for c in chunks],
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        _embeddings_cache = vectors
        logger.info("ml.rag.retrieve: embedded %d guideline chunks for semantic search", len(chunks))
        return _embeddings_cache
    except Exception as exc:
        logger.warning(
            "ml.rag.retrieve: embedding model unavailable (%s) — falling back to keyword overlap ranking",
            exc,
        )
        return None


def _keyword_search(query: str, k: int) -> list[dict]:
    """Original overlap ranking. Fallback only — see module docstring."""
    query_words = _tokenize(query)
    if not query_words:
        return []
    scored = []
    for chunk in _load_chunks():
        chunk_words = _tokenize(chunk.get("retrieval_chunk", "") + " " + chunk.get("name", ""))
        overlap = len(query_words & chunk_words)
        if overlap > 0:
            scored.append((overlap, chunk))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [{**chunk, "_score": float(score)} for score, chunk in scored[:k]]


def vector_search(query: str, k: int = 3) -> list[dict]:
    """Rank the guideline corpus against `query` by BGE-M3 cosine similarity
    and return the top k, each augmented with a `_score`. Falls back to
    keyword overlap when the model is unavailable.

    Never raises. Chunks scoring below _MIN_SIMILARITY are dropped rather
    than padded into the top-k: an unrelated clause is worse than no
    retrieved context, because explain.py would otherwise be handed a real
    rule_id it could legitimately cite for the wrong reason."""
    try:
        if not query or not query.strip():
            return []

        embeddings = _get_embeddings()
        if embeddings is None:
            return _keyword_search(query, k)

        from ml.similarity.semantic import get_model

        query_vec = get_model().encode(query, normalize_embeddings=True)

        chunks = _load_chunks()
        # Both sides are normalized, so the dot product is cosine similarity.
        scores = embeddings @ query_vec

        ranked = sorted(zip(scores, chunks), key=lambda pair: pair[0], reverse=True)
        return [
            {**chunk, "_score": round(float(score), 4)}
            for score, chunk in ranked[:k]
            if score >= _MIN_SIMILARITY
        ]
    except Exception:
        logger.exception("ml.rag.retrieve.vector_search failed, returning no context")
        return []
