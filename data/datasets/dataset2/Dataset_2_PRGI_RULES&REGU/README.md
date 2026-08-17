# Dataset 2 — Rebuilt from the supplied official PRGI PDF

Source: title_guidelines_1.pdf
Pages: 3
SHA-256: 76caadc88d602fc150354d485407919d73ce71b0eeb35ed2d2f5fb52f0ffd9b4

This rebuild uses ONLY the supplied PDF as the rule source. No external PRGI webpage, Act, FAQ, advisory, or legacy source was mixed into the rule records.

The PDF states that the guidelines are implemented from 01.07.2025 and supersede earlier guidelines.

Files:
- guideline_documents.csv
- guideline_sections.csv
- guideline_rules.csv
- guideline_chunks.csv
- schema.sql
- source_text.txt
- source_pdf_sha256.txt

`guideline_rules.csv` contains one record for each of the 18 numbered guideline points. Exact rule text is taken from the supplied PDF text extraction and page numbers are retained.
`guideline_chunks.csv` is RAG-ready but embeddings are intentionally blank; generate them using your chosen embedding model and store them in pgvector.
