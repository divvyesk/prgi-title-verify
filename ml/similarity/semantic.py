"""
SemanticScorer — the fourth similarity dimension, implementing the
SimilarityScorer Protocol from contracts/algo.py. Wraps the same BGE-M3
model already used successfully in
data/datasets/dataset1/embeddings/{generate_embeddings,semantic_search,
hybrid_search}.py — same model name, same normalize_embeddings=True
convention, so a query vector computed here is directly comparable to the
embeddings already stored in Postgres for all 82,713 titles. Never
re-embeds the dataset and never changes the model.

Why this dimension exists: it is the only one of the four that catches
cross-language and cross-script matches — "Daily News" vs "Dainik
Samachar" share no characters and no phonemes, but share a meaning, which
only a semantic embedding can see.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Sequence

from sentence_transformers import SentenceTransformer

logger = logging.getLogger("ml.similarity.semantic")

MODEL_NAME = "BAAI/bge-m3"

_model: SentenceTransformer | None = None
_model_lock = threading.Lock()


def get_model() -> SentenceTransformer:
    """Lazy module-level singleton. Loading BGE-M3 costs 10-30 seconds —
    call preload() once at FastAPI startup so this never happens inside a
    request. Thread-safe double-checked locking because uvicorn can serve
    concurrent requests that all race to trigger the first load."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                logger.info("loading %s ...", MODEL_NAME)
                t0 = time.perf_counter()
                _model = SentenceTransformer(MODEL_NAME)
                logger.info("loaded %s in %.1fs", MODEL_NAME, time.perf_counter() - t0)
    return _model


def preload() -> float:
    """Called from backend/app/main.py's lifespan handler. Returns the load
    time in seconds so the caller can log it."""
    t0 = time.perf_counter()
    get_model()
    return time.perf_counter() - t0


class SemanticScorer:
    name = "semantic"
    version = "1.0.0"

    def score(self, query: str, candidate: str) -> float:
        try:
            return self.score_batch(query, [candidate])[0]
        except Exception:
            logger.exception("semantic score() failed for %r vs %r", query, candidate)
            return 0.0

    def score_batch(self, query: str, candidates: Sequence[str]) -> list[float]:
        """One batched model.encode() call for all candidates, per contracts/
        algo.py rule 3.2 — this is what keeps 200-candidate scoring inside
        the performance budget instead of 200 separate model calls."""
        if not candidates:
            return []
        try:
            model = get_model()
            query_vec = model.encode(query, normalize_embeddings=True)
            candidate_vecs = model.encode(
                list(candidates), batch_size=64, normalize_embeddings=True, show_progress_bar=False
            )
            # Both sides are unit-normalized, so the dot product IS the
            # cosine similarity — no separate normalization step needed.
            similarities = candidate_vecs @ query_vec
            return [round(max(0.0, float(s)) * 100, 2) for s in similarities]
        except Exception:
            logger.exception("semantic score_batch() failed for query %r", query)
            return [0.0] * len(candidates)

    def explain(self, query: str, candidate: str) -> str:
        try:
            s = self.score(query, candidate)
            if s >= 80:
                return f"Very close in meaning ({s:.0f}% semantic match)."
            if s >= 50:
                return f"Related in meaning ({s:.0f}% semantic match) — possibly a cross-language or cross-script equivalent."
            return f"Little semantic overlap ({s:.0f}%)."
        except Exception:
            logger.exception("semantic explain() failed for %r vs %r", query, candidate)
            return ""


SCORER = SemanticScorer()
