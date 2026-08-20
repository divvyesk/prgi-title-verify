"""
TrigramRetriever — the fourth Stage 2 (SHORTLIST) retriever, implementing the
CandidateRetriever Protocol from contracts/algo.py.

ml/registry.py has always listed `trigram` as one of the four retrievers, but
the module was never written, so the registry logged it missing on every boot
and shortlisting ran a retriever short. This fills that gap.

Why trigram earns its place alongside bm25: BM25 matches whole tokens, so it
misses the exact failure mode PSS06 calls out by name — "variations in
spelling or slight modifications" such as Namaskar vs Namascar. Those share
almost no tokens but nearly all their character trigrams. pg_trgm scores
character-level overlap in Postgres, using the GIN index already declared in
data/datasets/dataset1/database/02_indexes.sql
(idx_titles_normalized_trgm), so it stays fast over the full corpus instead
of loading it into memory the way the BM25 index does.

The `%` operator (not a bare similarity() > threshold) is what lets Postgres
use that GIN index; similarity() alone would force a sequential scan of every
title. Threshold comes from pg_trgm.similarity_threshold, set per query so
this retriever never depends on a server-wide setting a teammate might have
changed.
"""

from __future__ import annotations

import logging

from contracts.contracts import Candidate
from search.db import connection

logger = logging.getLogger("search.retrievers.trigram")

# `%` uses the GIN trigram index; similarity() then gives the actual score for
# ranking. Matching title_normalized (not title) because that is the column
# 02_indexes.sql indexes, and the column the loader lowercases.
_QUERY = """
    SELECT
        title_id,
        title,
        registration_number,
        language,
        publication_state,
        similarity(title_normalized, %s) AS score
    FROM titles
    WHERE title_normalized %% %s
    ORDER BY score DESC
    LIMIT %s
"""


class TrigramRetriever:
    name = "trigram"

    def search(self, query: str, limit: int = 200) -> list[Candidate]:
        """Return candidates ranked best-first. Never raises (contracts/algo.py rule 5)."""
        normalized = " ".join(query.strip().lower().split())
        if not normalized:
            return []

        try:
            with connection() as conn, conn.cursor() as cur:
                # Deliberately low: shortlisting wants recall, and stage 3
                # re-scores everything properly anyway. Set per-session so a
                # different server-wide default cannot silently change recall.
                cur.execute("SET LOCAL pg_trgm.similarity_threshold = 0.25")
                cur.execute(_QUERY, (normalized, normalized, limit))
                rows = cur.fetchall()

            return [
                Candidate(
                    title_id=row[0],
                    title=row[1] or "",
                    reg_no=row[2] or "",
                    language=row[3] or "",
                    state=row[4] or "",
                    raw_score=round(max(0.0, min(1.0, float(row[5]))), 4),
                    source="trigram",
                )
                for row in rows
            ]
        except Exception:
            logger.exception("trigram retriever search() failed for query %r", query)
            return []


# ml/registry.py imports this module-level instance by name (contracts/algo.py).
RETRIEVER = TrigramRetriever()
