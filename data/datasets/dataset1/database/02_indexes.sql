CREATE INDEX IF NOT EXISTS idx_titles_normalized_trgm
ON titles
USING GIN (title_normalized gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_titles_transliterated_trgm
ON titles
USING GIN (title_transliterated gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_titles_core_trgm
ON titles
USING GIN (title_core gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_titles_embedding_hnsw
ON titles
USING HNSW (embedding vector_cosine_ops);