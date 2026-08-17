ALTER TABLE titles ADD COLUMN IF NOT EXISTS title_phonetic TEXT;
ALTER TABLE titles ADD COLUMN IF NOT EXISTS title_skeleton TEXT;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_titles_phonetic_trgm
ON titles
USING GIN (title_phonetic gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_titles_skeleton_trgm
ON titles
USING GIN (title_skeleton gin_trgm_ops);
