CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS titles (
    title_id BIGINT PRIMARY KEY,

    serial_number INTEGER,

    title TEXT,
    registration_number TEXT,
    registration_date DATE,

    language TEXT,
    periodicity TEXT,
    publisher TEXT,
    owner TEXT,

    publication_state TEXT,
    publication_district TEXT,

    data_quality_status TEXT,

    title_original TEXT,
    title_normalized TEXT,
    language_normalized TEXT,

    script TEXT,
    script_components TEXT,

    title_transliterated TEXT,
    transliteration_status TEXT,
    title_core TEXT,

    embedding VECTOR(1024)
);

ALTER TABLE titles
ADD COLUMN IF NOT EXISTS embedding VECTOR(1024);