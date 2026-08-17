# AGENTS.md — PRGI TitleGuard project memory

## Coding standards (checklist — apply to every change in this repo)

- [ ] Every similarity score is a float **0–100**. Never 0–1.
- [ ] Every timestamp is **ISO 8601 UTC**.
- [ ] JSON field names are **camelCase**. In Pydantic: `alias_generator=to_camel` with `populate_by_name=True`.
- [ ] Errors are structured: `{"error": {"code": "TITLE_EMPTY", "message": "..."}}`. Never expose a raw stack trace to the client.
- [ ] No secrets, API keys, or connection strings in source code. `.env` only.
- [ ] Never invent a legal citation. If the real clause text cannot be found, mark it `unverified` and say so explicitly.
- [ ] Never run `git add .`. Always name the specific files being added — this repo already carries 30 MB of CSVs and a 20 MB PDF.
- [ ] Never push to `main` or `dev`. Work on a feature branch and open a pull request.

---

## THE PROJECT
Name: PRGI TitleGuard — Automated Press Title Verification System
Event: Smart India Hackathon 2026, problem statement PSS06
Repo: https://github.com/divvyesk/prgi-title-verify
Deadline: 3 days. Feature freeze 19 Aug 2026, 15:00.

## WHAT THE SYSTEM DOES
Every new newspaper or magazine in India must get its title approved by the Press Registrar General of India (PRGI). Today that takes 25-30 days and is done by hand. This system does it in under 2 seconds.

A proposed title goes through a fixed 5-stage pipeline:
  1. NORMALIZE  - clean the text, detect the script/language, transliterate to Roman
  2. SHORTLIST  - narrow 82,713 registered titles down to ~200 plausible conflicts, using lexical + phonetic + semantic search in parallel
  3. SCORE      - score each candidate on 4 independent dimensions: lexical (spelling + word order), phonetic (sounds alike), semantic (same meaning, possibly in another language), core-word (same distinctive root after filler words are stripped)
  4. CHECK      - run deterministic rule checks against the official PRGI Guidelines for Admissibility of Titles
  5. EXPLAIN    - produce a traffic-light verdict (APPROVED / MANUAL_REVIEW / REJECTED) with evidence, real guideline citations, and a plain-language summary

There is also an "Agentic Title Studio" that invents alternative titles when one is rejected, and an "Officer Review Docket" for PRGI officers.

## WHAT IS ALREADY BUILT AND WORKING - DO NOT REBUILD ANY OF THIS
- frontend/ : a complete React 19 + TypeScript + Vite + Tailwind 3 single-page app. Components: LoadingIntro, VerificationView (the main screen, 35 KB), AgenticStudio, OfficerDashboard, RegistryExplorer, Header, Footer, Three.js background canvases, RoadmapModal.
  Client-side offline engine: src/utils/similarity.ts, rulesEngine.ts, transliteration.ts, verificationEngine.ts, audio.ts.
  Shared TypeScript types: src/types/index.ts (camelCase field names).
- data/datasets/dataset1/ : 82,713 registered titles, scraped and cleaned. Scripts: scrape.py, clean_titles.py, title_features.py, load_data.py. Derived columns already computed for every row: title_normalized, script, title_transliterated, title_core.
- PostgreSQL: table `titles` (01_schema.sql), three pg_trgm GIN indexes on title_normalized / title_transliterated / title_core (02_indexes.sql).
- Vector search: BGE-M3 embeddings generated for all 82,713 titles, stored in a pgvector column, indexed with HNSW. Working scripts: data/datasets/dataset1/embeddings/generate_embeddings.py, semantic_search.py, hybrid_search.py (trigram + vector merge).

## WHAT IS NOT BUILT YET
These files exist in the repo but are COMPLETELY EMPTY (0 bytes). Treat them as not written:
  backend/app/main.py, backend/requirements.txt, backend/Dockerfile
  ml/scoring.py, ml/embeddings/generate.py
  ml/similarity/lexical.py, phonetic.py, semantic.py, core_word.py
  contracts/contracts.py, contracts.js, algo.py, CHANGELOG.md
  docs/API_SPEC.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, GIT_WORKFLOW.md
  infra/docker-compose.yml, docker-compose.prod.yml
  search/database/schema.sql, indexes.sql
There is no backend at all. There is no rule engine, no RAG, no agent workflow, no BM25 index, no phonetic index, and no tests.

## KNOWN PROBLEMS IN THE EXISTING CODE
1. frontend/src/utils/rulesEngine.ts cites legal clauses such as "PRGI Digital Alignment Guidelines 2025, Rule 3(2)(b)" that do not appear to exist in the real guideline document. Fabricated citations are the single worst possible defect in this product. Never invent a clause number, anywhere.
2. The PRD text says the frontend is Next.js. It is actually Vite + React. Do NOT migrate it. Keep Vite.
3. The dataset is 100% Latin script. The `title_transliterated` column currently just lowercases already-Latin text; it is not real cross-script transliteration.

## TEAM AND FILE OWNERSHIP
Six people work in this repo at the same time. Each person owns folders that nobody else edits:
  Divvye      contracts/, backend/, ml/fusion/, ml/similarity/semantic.py, ml/registry.py, docs/
  Jai         ml/similarity/lexical.py, phonetic.py, core_word.py, ml/scoring.py, search/
  Pruthviraj  rules/, ml/rules/, data/datasets/dataset2/, data/eval/
  Suhani      agents/, ml/rag/, presentation/
  Gurpreet    frontend/src/api/, frontend/src/hooks/, frontend/src/App.tsx, frontend/src/components/verifier/, components/agents/, infra/
  Darsh       frontend/src/components/officer/, components/registry/, frontend/src/export/, frontend/tests/

Shared files that need the owner's permission before editing:
  contracts/*, config/weights.yaml, config/stopwords.txt, frontend/src/types/index.ts, infra/docker-compose.yml, README.md

## HARD RULES FOR ALL CODE IN THIS REPO
- Every similarity score is a float from 0 to 100. Never 0 to 1.
- Every timestamp is ISO 8601 UTC.
- JSON field names are camelCase (the frontend already uses camelCase). In Pydantic use alias_generator=to_camel with populate_by_name=True.
- Errors are structured: {"error": {"code": "TITLE_EMPTY", "message": "..."}}. Never expose a raw stack trace to the client.
- No secrets, API keys or connection strings in source code. Use .env only.
- Never invent a legal citation. If you cannot find the real clause text, mark it unverified and say so.
- Never run `git add .`. Always name the specific files you are adding. This repo already contains 30 MB of CSVs and a 20 MB PDF.
- Never push to `main` or `dev`. Work on a feature branch and open a pull request.

## MY ROLE
I am Jai. I build the matching algorithms - the part of the system that decides how similar two titles actually are. I own:
  - ml/similarity/lexical.py    spelling and word-order similarity (RapidFuzz)
  - ml/similarity/phonetic.py   sounds-alike similarity (Double Metaphone)
  - ml/similarity/core_word.py  similarity after stripping filler words
  - ml/scoring.py               blends all four dimensions into one composite score
  - search/                     the BM25 index and the phonetic candidate retriever
I do NOT own the semantic/embedding scorer - Divvye owns that one. I do not touch the backend, the frontend, or the rules.
Everything I write must implement the SimilarityScorer or CandidateRetriever interface defined in contracts/algo.py, so that the orchestrator can call any of my algorithms without knowing which one it is calling.
