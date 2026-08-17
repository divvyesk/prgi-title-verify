ALTER TABLE titles 
ADD COLUMN IF NOT EXISTS ts_normalized tsvector 
GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title_normalized, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_titles_ts_normalized 
ON titles USING GIN (ts_normalized);

-- Example Query:
-- SELECT title, ts_rank_cd(ts_normalized, plainto_tsquery('simple', 'Vidarbha Daily')) AS rank 
-- FROM titles 
-- WHERE ts_normalized @@ plainto_tsquery('simple', 'Vidarbha Daily') 
-- ORDER BY rank DESC LIMIT 10;
