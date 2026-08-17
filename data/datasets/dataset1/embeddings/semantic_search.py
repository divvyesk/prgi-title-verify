import sys

import psycopg2
from sentence_transformers import SentenceTransformer


MODEL_NAME = "BAAI/bge-m3"
TOP_K = 10

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "dataset1",
    "user": "pruthv",
}


def main():
    if len(sys.argv) < 2:
        print('Usage: python embeddings/semantic_search.py "TITLE"')
        sys.exit(1)

    query = " ".join(sys.argv[1:]).strip()

    if not query:
        print("Error: query cannot be empty.")
        sys.exit(1)

    print("Loading BGE-M3...")
    model = SentenceTransformer(MODEL_NAME)

    print(f"Searching for: {query}")

    query_vector = model.encode(
        query,
        normalize_embeddings=True,
    )

    if len(query_vector) != 1024:
        raise ValueError(
            f"Query embedding has {len(query_vector)} dimensions; "
            "expected 1024."
        )

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            title_id,
            title,
            language_normalized,
            1 - (embedding <=> %s::vector) AS similarity
        FROM titles
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> %s::vector
        LIMIT %s;
        """,
        (
            query_vector.tolist(),
            query_vector.tolist(),
            TOP_K,
        ),
    )

    results = cur.fetchall()

    print()
    print("=" * 90)
    print("DATASET 1 SEMANTIC SEARCH")
    print("=" * 90)
    print(f"Query: {query}")
    print(f"Top-K: {TOP_K}")
    print("=" * 90)

    for rank, (title_id, title, language, similarity) in enumerate(
        results, start=1
    ):
        print(
            f"[{rank:2}] "
            f"{title_id:<8} "
            f"{str(title):<45} "
            f"{str(language):<15} "
            f"{similarity * 100:>7.2f}%"
        )

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()