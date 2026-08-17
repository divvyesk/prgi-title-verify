import json

import psycopg2
from sentence_transformers import SentenceTransformer


DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "dataset1",
    "user": "pruthv",
}

MODEL_NAME = "BAAI/bge-m3"
EMBEDDING_DIMENSION = 1024
BATCH_SIZE = 64


def main():
    print("=" * 70)
    print("DATASET 1 EMBEDDING GENERATION")
    print("=" * 70)

    print(f"Model: {MODEL_NAME}")
    print(f"Expected dimension: {EMBEDDING_DIMENSION}")
    print(f"Batch size: {BATCH_SIZE}")
    print()

    print("Loading BGE-M3...")
    model = SentenceTransformer(MODEL_NAME)

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            title_id,
            title_normalized
        FROM titles
        WHERE embedding IS NULL
          AND title_normalized IS NOT NULL
          AND title_normalized <> ''
        ORDER BY title_id;
        """
    )

    rows = cur.fetchall()
    total = len(rows)

    print(f"Titles requiring embeddings: {total}")
    print()

    if total == 0:
        print("No titles require embeddings.")
        cur.close()
        conn.close()
        return

    for start in range(0, total, BATCH_SIZE):
        batch = rows[start:start + BATCH_SIZE]

        ids = [row[0] for row in batch]
        titles = [row[1] for row in batch]

        embeddings = model.encode(
            titles,
            batch_size=BATCH_SIZE,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        for title_id, embedding in zip(ids, embeddings):

            vector = embedding.tolist()

            if len(vector) != EMBEDDING_DIMENSION:
                raise ValueError(
                    f"title_id={title_id} produced "
                    f"{len(vector)} dimensions; "
                    f"expected {EMBEDDING_DIMENSION}"
                )

            cur.execute(
                """
                UPDATE titles
                SET embedding = %s::vector
                WHERE title_id = %s;
                """,
                (
                    json.dumps(vector),
                    title_id,
                ),
            )

        conn.commit()

        completed = start + len(batch)
        percentage = completed / total * 100

        print(
            f"Progress: {completed}/{total} "
            f"({percentage:.1f}%)"
        )

    cur.execute(
        """
        SELECT COUNT(*)
        FROM titles;
        """
    )
    total_titles = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM titles
        WHERE embedding IS NOT NULL;
        """
    )
    embedded_titles = cur.fetchone()[0]

    cur.close()
    conn.close()

    print()
    print("=" * 70)
    print("EMBEDDING GENERATION COMPLETE")
    print("=" * 70)
    print(f"Total titles in database: {total_titles}")
    print(f"Titles with embeddings:   {embedded_titles}")
    print("=" * 70)


if __name__ == "__main__":
    main()