import logging
import os
from typing import Sequence

import psycopg2

from contracts.algo import CandidateRetriever
from contracts.contracts import Candidate
from ml.similarity.phonetic import _QueryRep

logger = logging.getLogger(__name__)


class PhoneticRetriever:
    """
    CandidateRetriever implementation for phonetic (sounds-alike) search.

    Two-pass retrieval:
    1. Exact match on title_skeleton (score 1.0)
    2. pg_trgm similarity match on title_phonetic for the remaining limit
    """

    name: str = "phonetic"

    def search(self, query: str, limit: int = 200) -> list[Candidate]:
        """Return candidates ranked best-first. Never raises."""
        try:
            return self._search_impl(query, limit)
        except Exception as exc:
            logger.warning("PhoneticRetriever.search failed: %s", exc)
            return []

    def _search_impl(self, query: str, limit: int) -> list[Candidate]:
        if not query.strip():
            return []

        qr = _QueryRep(query)
        if not qr.skel:
            return []

        # Convert _QueryRep to our flattened string representation
        # matching what backfill_phonetic.py wrote to the database.
        tokens_str = []
        for code_set in qr.dm_codes:
            tokens_str.append(" ".join(sorted(code_set)))
        query_phonetic = " ".join(tokens_str)
        query_skeleton = qr.skel

        db_name = os.getenv("DB_NAME", "dataset1")
        db_user = os.getenv("DB_USER", "pruthv")
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_password = os.getenv("DB_PASSWORD", "")

        conn_args = {
            "dbname": db_name,
            "user": db_user,
            "host": db_host,
            "port": db_port,
        }
        if db_password:
            conn_args["password"] = db_password

        conn = psycopg2.connect(**conn_args)
        cur = conn.cursor()

        candidates: list[Candidate] = []
        seen_ids: set[int] = set()

        # Pass 1: Exact skeleton match (cheap, very high precision)
        cur.execute(
            """
            SELECT title_id, title, registration_number, language, publication_state
            FROM titles
            WHERE title_skeleton = %s
            LIMIT %s
            """,
            (query_skeleton, limit),
        )
        for row in cur.fetchall():
            title_id, title, reg_no, lang, state = row
            candidates.append(
                Candidate(
                    title_id=title_id,
                    title=title,
                    reg_no=reg_no if reg_no else "",
                    language=lang if lang else "",
                    state=state if state else "",
                    raw_score=1.0,
                    source="phonetic",
                )
            )
            seen_ids.add(title_id)

        remaining_limit = limit - len(candidates)

        # Pass 2: Trigram similarity on phonetic codes
        if remaining_limit > 0 and query_phonetic:
            if seen_ids:
                cur.execute(
                    """
                    SELECT title_id, title, registration_number, language, publication_state,
                           similarity(title_phonetic, %s) as raw_score
                    FROM titles
                    WHERE title_id != ALL(%s)
                      AND title_phonetic %% %s
                    ORDER BY similarity(title_phonetic, %s) DESC
                    LIMIT %s
                    """,
                    (
                        query_phonetic,
                        list(seen_ids),
                        query_phonetic,
                        query_phonetic,
                        remaining_limit,
                    ),
                )
            else:
                cur.execute(
                    """
                    SELECT title_id, title, registration_number, language, publication_state,
                           similarity(title_phonetic, %s) as raw_score
                    FROM titles
                    WHERE title_phonetic %% %s
                    ORDER BY similarity(title_phonetic, %s) DESC
                    LIMIT %s
                    """,
                    (
                        query_phonetic,
                        query_phonetic,
                        query_phonetic,
                        remaining_limit,
                    ),
                )

            for row in cur.fetchall():
                title_id, title, reg_no, lang, state, raw_score = row
                candidates.append(
                    Candidate(
                        title_id=title_id,
                        title=title,
                        reg_no=reg_no if reg_no else "",
                        language=lang if lang else "",
                        state=state if state else "",
                        raw_score=float(raw_score),
                        source="phonetic",
                    )
                )
                seen_ids.add(title_id)

        cur.close()
        conn.close()

        return candidates
