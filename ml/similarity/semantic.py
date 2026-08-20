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
import os
import threading
import time
from typing import TYPE_CHECKING, Sequence

if TYPE_CHECKING:
    # Type-checking only. The real import lives inside get_model() — see the
    # DISABLE_SEMANTIC note below for why it must not happen at module level.
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger("ml.similarity.semantic")

MODEL_NAME = "BAAI/bge-m3"

# Deliberate escape hatch for RAM-constrained hosts (Render's free tier
# gives 512MB; BGE-M3 needs ~2-3GB resident). Every caller of get_model() —
# SemanticScorer, VectorRetriever, ml/rag/retrieve.py's embedding search —
# already wraps its call in a try/except and degrades gracefully (empty
# retrieval results, a 0.0 score, keyword-overlap RAG fallback), by design.
# What they can't survive is what actually happened on the 512MB tier: the
# OS OOM-killing the whole process mid-load. That's a SIGKILL, not a Python
# exception — no amount of try/except downstream can catch it. So this flag
# refuses the load BEFORE it starts, turning "the process dies" into "one
# more ordinary exception every consumer already knows how to handle."
#
# Refusing to load the MODEL turned out not to be enough on its own, because
# `from sentence_transformers import SentenceTransformer` at module scope
# pulls in torch whether or not the model is ever used. Measured: 13MB for a
# bare interpreter, 358MB after that one import. 345MB of an unused library,
# on a host with 512MB total — roughly 72% of the idle footprint, which is
# why /v1/alternatives could still tip the process over with the flag set.
# The import now happens inside get_model(), so a DISABLE_SEMANTIC=1 process
# never pays for torch at all.
DISABLE_SEMANTIC = os.environ.get("DISABLE_SEMANTIC", "").strip().lower() in ("1", "true", "yes")

_model: "SentenceTransformer | None" = None
_model_lock = threading.Lock()


def get_model() -> "SentenceTransformer":
    """Lazy module-level singleton. Loading BGE-M3 costs 10-30 seconds —
    call preload() once at FastAPI startup so this never happens inside a
    request. Thread-safe double-checked locking because uvicorn can serve
    concurrent requests that all race to trigger the first load."""
    if DISABLE_SEMANTIC:
        raise RuntimeError(
            "semantic model disabled via DISABLE_SEMANTIC=1 — running on "
            "lexical/phonetic/core_word scoring and trigram/bm25/phonetic "
            "retrieval only"
        )

    # Deliberately not a module-level import: see DISABLE_SEMANTIC above.
    from sentence_transformers import SentenceTransformer

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


# Not exported at all when disabled — deliberately, not just "will fail if
# used." score_batch() above catches its own exceptions and returns
# [0.0, ...] (scorers are contractually forbidden from raising — see
# contracts/algo.py rule 4), which means pipeline.py's weighted blend would
# see a normal-looking all-zero result and average it in at full weight,
# silently dragging every composite score down as if 0% semantic similarity
# had actually been measured. Measured on a real request: 90.5 (correct,
# renormalized across the other 3 dimensions) vs 63.3 (wrong, semantic
# counted as a genuine zero) for the identical title.
#
# ml/registry.py imports this module and does getattr(module, "SCORER")
# inside its own try/except — the same path it uses for a teammate's
# unfinished module (0 bytes, no SCORER attribute defined yet). Not
# exporting SCORER here reuses that exact, already-tested mechanism: the
# scorer never registers, pipeline.py's renormalization only ever sees the
# 3 dimensions that are actually available, and nothing computes a fake
# measurement for a dimension that never ran.
if not DISABLE_SEMANTIC:
    SCORER = SemanticScorer()
