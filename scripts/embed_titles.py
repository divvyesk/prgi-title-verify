"""
Generate BGE-M3 embeddings for the title corpus and write them into
titles.embedding (pgvector), which is what the vector retriever and the
semantic scorer's shortlist path both read.

Why not data/datasets/dataset1/embeddings/generate_embeddings.py: that script
is psycopg2 + a hardcoded personal database, same as the other dataset
scripts. This one goes through search/db.py so it targets whatever the
backend targets.

Resumable on purpose. Embedding 82k titles takes ~25 minutes on an M-series
Mac, and the single worst thing during hackathon setup is losing 20 minutes
of that to a laptop sleeping. Only rows WHERE embedding IS NULL are selected,
so re-running continues instead of restarting.

    python3 scripts/embed_titles.py
    python3 scripts/embed_titles.py --limit 2000   # quick partial run
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))

from ml.similarity.semantic import get_model  # noqa: E402
from search.db import connection, database_url  # noqa: E402

# Titles are only a few tokens each, so a large batch keeps the GPU busy
# without meaningful memory pressure.
BATCH = 256
# Rows pushed per UPDATE round-trip.
WRITE_CHUNK = 1000


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="only embed N rows (0 = all)")
    ap.add_argument("--batch", type=int, default=BATCH)
    args = ap.parse_args()

    print(f"database: {database_url()}")

    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM titles WHERE embedding IS NULL")
        remaining = cur.fetchone()[0]
        if remaining == 0:
            print("every title already has an embedding — nothing to do")
            return 0

        sql = """
            SELECT title_id, COALESCE(NULLIF(title_normalized, ''), title, '')
            FROM titles
            WHERE embedding IS NULL
            ORDER BY title_id
        """
        if args.limit:
            sql += f" LIMIT {int(args.limit)}"
        cur.execute(sql)
        rows = cur.fetchall()

    print(f"{remaining:,} rows without embeddings; embedding {len(rows):,} this run")

    t0 = time.time()
    model = get_model()
    print(f"model ready on {model.device} in {time.time() - t0:.1f}s")

    ids = [r[0] for r in rows]
    texts = [r[1] or "" for r in rows]

    t0 = time.time()
    done = 0
    pending: list[tuple[str, int]] = []

    with connection() as conn, conn.cursor() as cur:
        for start in range(0, len(texts), args.batch):
            chunk_ids = ids[start : start + args.batch]
            chunk_texts = texts[start : start + args.batch]

            vectors = model.encode(
                chunk_texts,
                batch_size=args.batch,
                normalize_embeddings=True,
                show_progress_bar=False,
            )

            for title_id, vec in zip(chunk_ids, vectors):
                # pgvector accepts the literal '[a,b,c]' text form.
                pending.append(("[" + ",".join(f"{v:.6f}" for v in vec) + "]", title_id))

            done += len(chunk_ids)

            if len(pending) >= WRITE_CHUNK:
                cur.executemany(
                    "UPDATE titles SET embedding = %s::vector WHERE title_id = %s",
                    pending,
                )
                conn.commit()
                pending.clear()
                rate = done / (time.time() - t0)
                eta = (len(texts) - done) / rate / 60 if rate else 0
                print(f"  {done:,}/{len(texts):,}  {rate:.0f}/s  eta {eta:.1f} min", flush=True)

        if pending:
            cur.executemany(
                "UPDATE titles SET embedding = %s::vector WHERE title_id = %s",
                pending,
            )
            conn.commit()

    elapsed = time.time() - t0

    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM titles WHERE embedding IS NOT NULL")
        filled = cur.fetchone()[0]

    print(f"embedded {done:,} rows in {elapsed / 60:.1f} min")
    print(f"titles with embeddings: {filled:,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
