CREATE TABLE IF NOT EXISTS guideline_chunks (
  chunk_id  BIGSERIAL PRIMARY KEY,
  rule_id   TEXT,
  section   TEXT,
  text      TEXT NOT NULL,
  embedding vector(1024)
);

CREATE INDEX IF NOT EXISTS idx_guideline_chunks_hnsw
  ON guideline_chunks USING hnsw (embedding vector_cosine_ops);
