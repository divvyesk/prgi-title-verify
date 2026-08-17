import psycopg
from sentence_transformers import SentenceTransformer

def test_rag_retrieval(query: str, model_name: str = 'BAAI/bge-m3', db_conn_str: str = 'dbname=postgres'):
    print(f"Loading embedding model {model_name}...")
    model = SentenceTransformer(model_name)
    
    print(f"\nUser Query: '{query}'")
    print("Converting query to vector...")
    # Convert the search query into a 1024-number vector
    query_vector = model.encode([query])[0].tolist()
    
    print("Searching PostgreSQL database using pgvector...\n")
    try:
        with psycopg.connect(db_conn_str) as conn:
            with conn.cursor() as cur:
                # The <-> operator computes the Cosine Distance between vectors.
                # We order by distance ascending (lowest distance = highest similarity)
                # and LIMIT to the top 2 results.
                cur.execute(
                    """
                    SELECT text, 
                           1 - (embedding <-> %s::vector) AS similarity_score
                    FROM guideline_chunks 
                    ORDER BY embedding <-> %s::vector 
                    LIMIT 2;
                    """,
                    (str(query_vector), str(query_vector))
                )
                
                results = cur.fetchall()
                
                print("--- TOP MATCHES FOUND ---")
                for i, row in enumerate(results):
                    text = row[0]
                    score = row[1]
                    print(f"\nMatch #{i+1} (Similarity Score: {score:.3f}):")
                    print(f"\"{text}\"")
                    
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    # Test our system with a query about matrimonial/classified ads
    test_query = "Are we allowed to publish classifieds or matrimonial ads?"
    test_rag_retrieval(test_query)
