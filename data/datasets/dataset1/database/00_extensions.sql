-- Extensions must exist before anything that references their operator
-- classes. This file is numbered 00 so it runs first in both places these
-- migrations get executed:
--
--   * Postgres' docker-entrypoint-initdb.d, which runs *.sql in alphabetical
--     order. Before this file existed, 02_indexes.sql (gin_trgm_ops) ran
--     while pg_trgm did not exist, because pg_trgm was only created over in
--     search/database/03_phonetic.sql — a directory the container never
--     mounts. Init aborted, and the compose stack came up with no schema.
--
--   * scripts/bootstrap_db.sh, which applies the files explicitly.
--
-- Both extensions are declared here rather than relying on whichever later
-- file happens to create them first.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
