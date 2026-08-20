import logging
import platform
import resource
import time
from typing import Sequence

from rank_bm25 import BM25Okapi

from contracts.algo import CandidateRetriever
from contracts.contracts import Candidate
from ml.similarity.tokens import tokens
from search.db import connection

logger = logging.getLogger(__name__)

_index: BM25Okapi | None = None
_documents: list[dict] = []
_warmed: bool = False


def get_memory_mb() -> float:
    usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    # On macOS (Darwin) ru_maxrss is in bytes. On Linux, it's in kilobytes.
    if platform.system() == "Darwin":
        return usage / (1024 * 1024)
    return usage / 1024


def warm() -> None:
    """Load all titles and build the BM25 index. This acts as a lazy singleton."""
    global _index, _documents, _warmed

    if _warmed:
        return

    try:
        logger.info("Connecting to database to warm BM25 index...")

        t0 = time.time()

        # Goes through search/db.py so this uses the server's shared psycopg3
        # pool when running inside FastAPI, and a standalone connection to the
        # same DATABASE_URL otherwise. Previously this opened its own psycopg2
        # connection to a hardcoded personal database.
        with connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT title_id, title_normalized, title, registration_number,
                       language, publication_state
                FROM titles
                """
            )
            rows = cur.fetchall()

        logger.info(f"Fetched {len(rows)} titles from DB. Building BM25 index...")

        corpus_tokens = []
        _documents.clear()

        for row in rows:
            t_id, t_norm, t_orig, reg, lang, state = row
            # Tokenize title_normalized
            toks = tokens(t_norm if t_norm else "")
            corpus_tokens.append(toks)

            _documents.append(
                {
                    "title_id": t_id,
                    "title": t_orig,
                    "reg_no": reg if reg else "",
                    "language": lang if lang else "",
                    "state": state if state else "",
                }
            )

        _index = BM25Okapi(corpus_tokens)
        _warmed = True

        t1 = time.time()
        mem = get_memory_mb()
        logger.info(
            f"BM25 index built in {t1 - t0:.2f} seconds. Max RSS memory: {mem:.2f} MB"
        )

    except Exception as exc:
        logger.warning(f"Failed to warm BM25 index: {exc}")


class BM25Retriever:
    """
    Keyword retriever using BM25Okapi.
    Scores are normalized relative to the top result (0.0 to 1.0).
    """

    name: str = "bm25"

    def search(self, query: str, limit: int = 200) -> list[Candidate]:
        if not query.strip():
            return []

        # Ensure index is built (lazy init)
        warm()

        if not _index or not _documents:
            return []

        toks_q = tokens(query)
        if not toks_q:
            return []

        raw_scores = _index.get_scores(toks_q)

        # Pair scores with their document index, keeping only non-zero matches
        scores_with_idx = [
            (score, idx) for idx, score in enumerate(raw_scores) if score > 0.0
        ]

        if not scores_with_idx:
            return []

        # Sort by score descending
        scores_with_idx.sort(key=lambda x: x[0], reverse=True)
        top_k = scores_with_idx[:limit]

        # Normalize to 0.0 - 1.0 by dividing by the highest score in the results
        max_score = top_k[0][0]

        candidates: list[Candidate] = []
        for score, idx in top_k:
            doc = _documents[idx]
            candidates.append(
                Candidate(
                    title_id=doc["title_id"],
                    title=doc["title"],
                    reg_no=doc["reg_no"],
                    language=doc["language"],
                    state=doc["state"],
                    raw_score=float(score / max_score) if max_score > 0 else 0.0,
                    source="bm25",
                )
            )

        return candidates


# ml/registry.py imports this module-level instance by name and never
# instantiates the class itself (contracts/algo.py). Without it the retriever
# silently never registers, which is exactly what was happening.
RETRIEVER = BM25Retriever()
