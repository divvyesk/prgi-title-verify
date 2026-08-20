#!/usr/bin/env bash
#
# Build the PRGI TitleGuard database from nothing, in one command.
#
#   ./scripts/bootstrap_db.sh              # schema + titles + phonetics + indexes
#   ./scripts/bootstrap_db.sh --embeddings # also run the ~25 min embedding pass
#
# Why this exists: getting the database right takes six ordered steps, and two
# of them fail in ways that are not obvious. Nobody should have to rediscover
# that during setup on a demo machine.
#
# Ordering that matters:
#   * pg_trgm must exist BEFORE 02_indexes.sql, which uses gin_trgm_ops. The
#     committed migrations create the extension in search/database/03_phonetic
#     .sql, i.e. after the file that needs it, so running them in filename
#     order fails.
#   * The trigram/fulltext indexes are built AFTER the bulk load. Building
#     them first makes the 82k-row COPY dramatically slower.
#   * Embeddings are opt-in. They take ~25 minutes and compete with the
#     backend for the GPU — a verification that normally takes 5s took 194s
#     while the embedding pass was running. Never run them during a demo.
#
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

PSQL="${PSQL:-psql}"
PGPORT_="${PGPORT:-5433}"
DBNAME="${DBNAME:-prgi_titleguard}"
PY="${PY:-$REPO/backend/.venv/bin/python3}"

WITH_EMBEDDINGS=0
[[ "${1:-}" == "--embeddings" ]] && WITH_EMBEDDINGS=1

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

say "Target: $DBNAME on port $PGPORT_"

say "1/6  Creating database (ok if it already exists)"
"$PSQL" -p "$PGPORT_" -d postgres -c "CREATE DATABASE $DBNAME" 2>/dev/null \
  || echo "     already exists, continuing"

say "2/6  Extensions + schema"
# pgvector and pg_trgm first: 02_indexes.sql below depends on gin_trgm_ops,
# and 01_schema.sql declares a vector(1024) column.
"$PSQL" -p "$PGPORT_" -d "$DBNAME" -v ON_ERROR_STOP=1 \
  -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;"
"$PSQL" -p "$PGPORT_" -d "$DBNAME" -v ON_ERROR_STOP=1 -f data/datasets/dataset1/database/01_schema.sql
"$PSQL" -p "$PGPORT_" -d "$DBNAME" -v ON_ERROR_STOP=1 -f search/database/03_phonetic.sql
"$PSQL" -p "$PGPORT_" -d "$DBNAME" -v ON_ERROR_STOP=1 -f search/database/04_fulltext.sql
"$PSQL" -p "$PGPORT_" -d "$DBNAME" -v ON_ERROR_STOP=1 -f data/datasets/dataset1/database/04_guidelines.sql

say "3/6  Loading the title corpus (82,713 rows)"
"$PY" scripts/load_titles.py

say "4/6  Backfilling phonetic codes"
"$PY" search/scripts/backfill_phonetic.py

say "5/6  Building search indexes"
# CONCURRENTLY so this stays safe to re-run against a live database.
for idx in \
  "idx_titles_normalized_trgm ON titles USING GIN (title_normalized gin_trgm_ops)" \
  "idx_titles_transliterated_trgm ON titles USING GIN (title_transliterated gin_trgm_ops)" \
  "idx_titles_core_trgm ON titles USING GIN (title_core gin_trgm_ops)"
do
  "$PSQL" -p "$PGPORT_" -d "$DBNAME" -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS $idx"
done

if [[ $WITH_EMBEDDINGS -eq 1 ]]; then
  say "6/6  Generating embeddings (~25 min, resumable — do NOT run during a demo)"
  "$PY" scripts/embed_titles.py
  # The HNSW index is only worth building once vectors exist.
  "$PSQL" -p "$PGPORT_" -d "$DBNAME" \
    -c "CREATE INDEX IF NOT EXISTS idx_titles_embedding_hnsw ON titles USING HNSW (embedding vector_cosine_ops)"
else
  say "6/6  Skipping embeddings (pass --embeddings to include them)"
fi

say "Done. Current state:"
"$PSQL" -p "$PGPORT_" -d "$DBNAME" -tc "
  SELECT 'titles          : '||count(*) FROM titles
  UNION ALL SELECT 'phonetic codes  : '||count(*) FROM titles WHERE title_phonetic <> ''
  UNION ALL SELECT 'embeddings      : '||count(*) FROM titles WHERE embedding IS NOT NULL"

cat <<EOF

Point the backend at it with backend/.env:
  DATABASE_URL=postgresql://\$USER@localhost:$PGPORT_/$DBNAME
  STUB_MODE=0
EOF
