"""
VectorRetriever — one of the four Stage 2 (SHORTLIST) retrievers, implementing
the CandidateRetriever Protocol from contracts/algo.py. Uses the exact HNSW
query pattern already proven in
data/datasets/dataset1/embeddings/semantic_search.py
(ORDER BY embedding <=> %s::vector LIMIT %s) — copied, not redesigned.

Known schema drift (see AGENTS.md): the committed
data/datasets/dataset1/database/01_schema.sql does not declare an `embedding`
column, and 03_search.sql (meant to add the pgvector extension + HNSW index)
is empty. Pruthviraj owns fixing that. Until it's fixed, search() below fails
closed — returns an empty list and logs, per contracts/algo.py rule 5 (never
raise) — rather than crashing the whole shortlist stage over one retriever.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.db import get_pool
from ml.similarity.semantic import get_model

if TYPE_CHECKING:
    from contracts.contracts import Candidate

logger = logging.getLogger("search.retrievers.vector")

_QUERY = """
    SELECT
        title_id,
        title,
        registration_number,
        language,
        publication_state,
        1 - (embedding <=> %s::vector) AS similarity
    FROM titles
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> %s::vector
    LIMIT %s
"""


class VectorRetriever:
    name = "vector"

    def search(self, query: str, limit: int = 200) -> list["Candidate"]:
        from contracts.contracts import Candidate

        try:
            model = get_model()
            query_vector = model.encode(query, normalize_embeddings=True).tolist()

            pool = get_pool()
            with pool.connection() as conn, conn.cursor() as cur:
                cur.execute(_QUERY, (query_vector, query_vector, limit))
                rows = cur.fetchall()

            return [
                Candidate(
                    titleId=row[0],
                    title=row[1] or "",
                    regNo=row[2] or "",
                    language=row[3] or "",
                    state=row[4] or "",
                    rawScore=round(max(0.0, min(1.0, float(row[5]))), 4),
                    source="vector",
                )
                for row in rows
            ]
        except Exception:
            logger.exception("vector retriever search() failed for query %r", query)
            return []


RETRIEVER = VectorRetriever()
