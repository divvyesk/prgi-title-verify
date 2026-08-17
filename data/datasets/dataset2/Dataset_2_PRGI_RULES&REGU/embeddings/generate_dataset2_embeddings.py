from pathlib import Path

content = '''import json
from pathlib import Path

import pandas as pd
import psycopg2


BASE_DIR = Path(__file__).resolve().parents[1]

CHUNKS_FILE = BASE_DIR / "data" / "processed" / "guideline_chunks.csv"
EMBEDDINGS_FILE = BASE_DIR / "data" / "processed" / "guideline_chunk_embeddings.csv"


def main():
    chunks = pd.read_csv(CHUNKS_FILE)
    embeddings = pd.read_csv(EMBEDDINGS_FILE)

    print(f"Chunks loaded: {len(chunks)}")
    print(f"Embeddings loaded: {len(embeddings)}")

    # Validate chunk IDs.
    if chunks["chunk_id"].duplicated().any():
        raise ValueError("Duplicate chunk_id in guideline_chunks.csv")

    if embeddings["chunk_id"].duplicated().any():
        raise ValueError("Duplicate chunk_id in embeddings CSV")

    # Join the verified RAG chunks with their generated BGE-M3 embeddings.
    #
    # guideline_chunks.csv already contains an empty "embedding" column.
    # Therefore, after the merge, the real generated vectors from
    # guideline_chunk_embeddings.csv are stored in "embedding_embedding".
    merged = chunks.merge(
        embeddings,
        on="chunk_id",
        how="left",
        validate="one_to_one",
        suffixes=("", "_embedding"),
    )

    # Make sure every RAG chunk has a generated embedding.
    if merged["embedding_embedding"].isna().any():
        missing = merged.loc[
            merged["embedding_embedding"].isna(), "chunk_id"
        ].tolist()
        raise ValueError(f"Missing embeddings for: {missing}")

    # Use the generated BGE-M3 embedding column.
    merged["embedding"] = merged["embedding_embedding"]

    print(f"Rows ready for PostgreSQL: {len(merged)}")

    # Connect to the existing PostgreSQL 17 database.
    conn = psycopg2.connect(
        dbname="dataset1",
        user="pruthv",
        host="localhost",
        port=5432,
    )

    cur = conn.cursor()

    # Insert/update every Dataset 2 RAG chunk and its embedding.
    for _, row in merged.iterrows():
        vector = json.loads(row["embedding"])

        # BAAI/bge-m3 must produce 1024-dimensional vectors
        # for the agreed Dataset 2 configuration.
        if len(vector) != 1024:
            raise ValueError(
                f"{row['chunk_id']} has {len(vector)} dimensions"
            )

        cur.execute(
            """
            INSERT INTO guideline_chunks (
                chunk_id,
                document_id,
                section_id,
                rule_id,
                chunk_index,
                chunk_text,
                retrieval_text,
                metadata_json,
                source_page,
                source_reference,
                language,
                embedding
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s::vector
            )
            ON CONFLICT (chunk_id)
            DO UPDATE SET
                document_id = EXCLUDED.document_id,
                section_id = EXCLUDED.section_id,
                rule_id = EXCLUDED.rule_id,
                chunk_index = EXCLUDED.chunk_index,
                chunk_text = EXCLUDED.chunk_text,
                retrieval_text = EXCLUDED.retrieval_text,
                metadata_json = EXCLUDED.metadata_json,
                source_page = EXCLUDED.source_page,
                source_reference = EXCLUDED.source_reference,
                language = EXCLUDED.language,
                embedding = EXCLUDED.embedding;
            """,
            (
                row["chunk_id"],
                row["document_id"],
                row["section_id"],
                row["rule_id"],
                int(row["chunk_index"]),
                row["chunk_text"],
                row["retrieval_text"],
                row["metadata_json"],
                int(row["source_page"]),
                row["source_reference"],
                row["language"],
                json.dumps(vector),
            ),
        )

    conn.commit()

    # Verify the final database state.
    cur.execute("SELECT COUNT(*) FROM guideline_chunks;")
    count = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM guideline_chunks
        WHERE embedding IS NOT NULL;
        """
    )
    embedded_count = cur.fetchone()[0]

    cur.close()
    conn.close()

    print()
    print("Dataset 2 loading complete.")
    print(f"Rows in guideline_chunks: {count}")
    print(f"Rows with embeddings: {embedded_count}")


if __name__ == "__main__":
    main()
'''

path = Path("/mnt/data/load_dataset2_embeddings_updated.py")
path.write_text(content)
print(path)
