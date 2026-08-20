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

from ml.similarity.semantic import DISABLE_SEMANTIC, get_model
from search.db import connection

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

            with connection() as conn, conn.cursor() as cur:
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


# Not exported when the semantic model is disabled (DISABLE_SEMANTIC=1).
# Unlike the semantic scorer, an always-failing retriever isn't a
# correctness bug — RRF fusion over the other 3 retrievers' results is
# unaffected by one source contributing nothing, and 100% shortlist recall
# was already measured with just trigram/bm25/phonetic. This guard exists
# for operational cleanliness only: without it, every single request would
# attempt a doomed model load and log a full ERROR-level traceback, drowning
# out logs that actually matter.
if not DISABLE_SEMANTIC:
    RETRIEVER = VectorRetriever()
