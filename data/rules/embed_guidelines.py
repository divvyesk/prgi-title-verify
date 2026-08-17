import json
import psycopg
from psycopg import sql
from sentence_transformers import SentenceTransformer

def embed_and_store_guidelines(
    json_path: str = 'data/rules/guideline_chunks.json', 
    model_name: str = 'BAAI/bge-m3',
    db_conn_str: str = 'dbname=postgres'
):
    print(f"Loading chunks from {json_path}...")
    with open(json_path, 'r') as f:
        chunks = json.load(f)
    
    if not chunks:
        print("No chunks found. Aborting.")
        return

    print(f"Loading embedding model {model_name}...")
    # BGE-M3 outputs 1024 dimensional vectors
    model = SentenceTransformer(model_name)
    
    # We only extract the texts to process them in a batch for speed
    texts = [chunk['text'] for chunk in chunks]
    
    print("Generating embeddings (this may take a moment)...")
    embeddings = model.encode(texts, show_progress_bar=True)
    
    print("Connecting to database to insert vectors...")
    try:
        # Connect to local postgres database where we ran 04_guidelines.sql
        with psycopg.connect(db_conn_str) as conn:
            with conn.cursor() as cur:
                # Enable vector extension support in psycopg3 (optional but recommended for pure vectors, 
                # though passing as lists works fine natively)
                
                # Clear existing chunks if we are re-running this script
                cur.execute("TRUNCATE TABLE guideline_chunks;")
                
                # Insert the new chunks
                for i, chunk in enumerate(chunks):
                    # pgvector expects vectors to be formatted as strings like '[0.1, 0.2, ...]'
                    # or psycopg can adapt lists automatically. We'll format as a list of floats.
                    embedding_list = embeddings[i].tolist()
                    
                    # We leave rule_id and section as NULL for now since we just chunked raw text
                    cur.execute(
                        """
                        INSERT INTO guideline_chunks (text, embedding)
                        VALUES (%s, %s::vector)
                        """,
                        (chunk['text'], str(embedding_list))
                    )
                
            conn.commit()
            print(f"Successfully stored {len(chunks)} embedded chunks in PostgreSQL!")
            
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    embed_and_store_guidelines()
