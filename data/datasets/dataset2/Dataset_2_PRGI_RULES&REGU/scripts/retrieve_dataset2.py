import sys

import psycopg2
from sentence_transformers import SentenceTransformer


MODEL_NAME = "BAAI/bge-m3"
TOP_K = 5


def load_model():
    print(f"Loading model: {MODEL_NAME}")
    return SentenceTransformer(MODEL_NAME)


def embed_query(model, query):
    print("Generating query embedding...")

    embedding = model.encode(
        query,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    if len(embedding) != 1024:
        raise ValueError(
            f"Expected 1024 dimensions, got {len(embedding)}"
        )

    return embedding.tolist()


def search_database(query_vector, top_k=TOP_K):
    print("Searching PostgreSQL with cosine similarity...")

    conn = psycopg2.connect(
        dbname="dataset1",
        user="pruthv",
        host="localhost",
        port=5432,
    )

    cur = conn.cursor()

    vector_string = "[" + ",".join(map(str, query_vector)) + "]"

    cur.execute(
        """
        SELECT
            chunk_id,
            rule_id,
            section_id,
            chunk_text,
            source_page,
            source_reference,
            1 - (embedding <=> %s::vector) AS similarity
        FROM guideline_chunks
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> %s::vector
        LIMIT %s;
        """,
        (vector_string, vector_string, top_k),
    )

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return rows


def print_results(query, rows):
    print()
    print("=" * 80)
    print("QUERY")
    print("=" * 80)
    print(query)

    print()
    print("=" * 80)
    print(f"TOP {len(rows)} PRGI GUIDELINE RESULTS")
    print("=" * 80)

    for rank, row in enumerate(rows, start=1):
        (
            chunk_id,
            rule_id,
            section_id,
            chunk_text,
            source_page,
            source_reference,
            similarity,
        ) = row

        print()
        print(f"[{rank}] {chunk_id}")
        print(f"Rule: {rule_id}")
        print(f"Section: {section_id}")
        print(f"Similarity: {similarity:.4f} ({similarity * 100:.2f}%)")
        print(f"Source page: {source_page}")
        print(f"Source: {source_reference}")
        print(f"Text: {chunk_text}")


def main():
    if len(sys.argv) < 2:
        print(
            'Usage: python scripts/retrieve_dataset2.py '
            '"your PRGI question or situation"'
        )
        sys.exit(1)

    query = " ".join(sys.argv[1:]).strip()

    if not query:
        raise ValueError("Query cannot be empty.")

    model = load_model()
    query_vector = embed_query(model, query)
    rows = search_database(query_vector)

    if not rows:
        print("No guideline chunks found.")
        return

    print_results(query, rows)


if __name__ == "__main__":
    main()
