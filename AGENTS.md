# AGENTS.md — PRGI TitleGuard project memory

This file is the persistent brief for anyone (human or agent) picking up work in
this repository. It is the full onboarding brief as given to Darsh (Officer UI,
Export & Testing lead), preserved in full so future sessions do not need to be re-briefed.

---

## Coding standards (checklist — apply to every change in this repo)

- [ ] Every similarity score is a float **0–100**. Never 0–1.
- [ ] Every timestamp is **ISO 8601 UTC**.
- [ ] JSON field names are **camelCase**. In Pydantic: `alias_generator=to_camel`
      with `populate_by_name=True`.
- [ ] Errors are structured: `{"error": {"code": "TITLE_EMPTY", "message": "..."}}`.
      Never expose a raw stack trace to the client.
- [ ] No secrets, API keys, or connection strings in source code. `.env` only.
- [ ] Never invent a legal citation. If the real clause text cannot be found,
      mark it `unverified` and say so explicitly.
- [ ] Never run `git add .`. Always name the specific files being added — this
      repo already carries 30 MB of CSVs and a 20 MB PDF.
- [ ] Never push to `main` or `dev`. Work on a feature branch (`officer-ui`) and open a pull request.
- [ ] Prefer extending an existing working file over writing a new one from scratch.
- [ ] Do not restructure the repository: no deleting, renaming, or moving existing
      files/folders (including `contracts/contracts.js`, which stays `.js`).
- [ ] Do not reorganise `data/`, `ml/`, `search/`, `backend/`, or `frontend/`.
- [ ] Stay inside your own file ownership (`frontend/src/components/officer/`,
      `frontend/src/components/registry/`, `frontend/src/export/`, `frontend/tests/`);
      shared files need the owner's permission.
- [ ] One topic branch per person, kept for all three days. No branch-per-task,
      no `dev` branch, never commit directly to `main`.

---

## THE PROJECT

Name: PRGI TitleGuard — Automated Press Title Verification System  
Event: Smart India Hackathon 2026, problem statement PSS06  
Repo: https://github.com/divvyesk/prgi-title-verify  
Deadline: 3 days. Feature freeze 19 Aug 2026, 15:00.  

## WHAT THE SYSTEM DOES

Every new newspaper or magazine in India must get its title approved by the Press
Registrar General of India (PRGI). Today that takes 25-30 days and is done by hand.
This system does it in under 2 seconds.

A proposed title goes through a fixed 5-stage pipeline:

1. NORMALIZE — clean the text, detect the script/language, transliterate to Roman
2. SHORTLIST — narrow 82,713 registered titles down to ~200 plausible conflicts,
   using lexical + phonetic + semantic search in parallel
3. SCORE — score each candidate on 4 independent dimensions:
   lexical (spelling + word order), phonetic (sounds alike),
   semantic (same meaning, possibly in another language),
   core-word (same distinctive root after filler words are stripped)
4. CHECK — run deterministic rule checks against the official PRGI
   Guidelines for Admissibility of Titles
5. EXPLAIN — produce a traffic-light verdict (APPROVED / MANUAL_REVIEW /
   REJECTED) with evidence, real guideline citations, and a
   plain-language summary

There is also an "Agentic Title Studio" that invents alternative titles when one is
rejected, and an "Officer Review Docket" for PRGI officers.

## WHAT IS ALREADY BUILT AND WORKING — DO NOT REBUILD ANY OF THIS

- `frontend/` : a complete, working React 19 + TypeScript + Vite + Tailwind 3
  single-page app. Components: LoadingIntro, VerificationView (the main screen,
  35 KB), AgenticStudio, OfficerDashboard, RegistryExplorer, Header, Footer,
  Three.js background canvases, RoadmapModal. It runs today with
  `cd frontend && npm install && npm run dev`.
- `frontend/src/utils/` : a working client-side offline engine — similarity.ts
  (Levenshtein, token-sort, Soundex+Metaphone, core-word), rulesEngine.ts (6 rules),
  transliteration.ts (script detection + Indic to Roman), verificationEngine.ts
  (the full 5-stage pipeline, offline), audio.ts.
- `frontend/src/types/index.ts` : the existing shared TypeScript types. The
  frontend already depends on these, so they are the starting point for the API
  contract, not something to redesign.
- `data/datasets/dataset1/` : 82,713 registered titles, already scraped and
  cleaned. Working scripts: scrape.py, clean_titles.py, title_features.py,
  load_data.py. Derived columns already computed for every row:
  title_normalized, script, title_transliterated, title_core.
- PostgreSQL: the `titles` table is created and loaded, with three working
  pg_trgm GIN indexes on title_normalized / title_transliterated / title_core.
- Vector search: BGE-M3 embeddings have ALREADY been generated for all 82,713
  titles, stored in a pgvector column and indexed with HNSW. Working scripts:
  data/datasets/dataset1/embeddings/generate_embeddings.py, semantic_search.py,
  hybrid_search.py (a working trigram + vector merge).
  Never re-embed the dataset. It is done. Query the existing index.

## WHAT IS NOT BUILT YET

These files exist in the repo but are COMPLETELY EMPTY (0 bytes). Treat them as
not written:
  `backend/app/main.py`, `backend/requirements.txt`, `backend/Dockerfile`
  `ml/scoring.py`, `ml/embeddings/generate.py`
  `ml/similarity/lexical.py`, `phonetic.py`, `semantic.py`, `core_word.py`
  `contracts/contracts.py`, `contracts.js`, `algo.py`, `CHANGELOG.md`
  `docs/API_SPEC.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `GIT_WORKFLOW.md`
  `infra/docker-compose.yml`, `docker-compose.prod.yml`
  `search/database/schema.sql`, `indexes.sql`
There is no backend at all. There is no rule engine, no RAG, no agent workflow,
no BM25 index, no phonetic index, and no tests.

## KNOWN PROBLEMS IN THE EXISTING CODE

1. `frontend/src/utils/rulesEngine.ts` cites legal clauses such as
   "PRGI Digital Alignment Guidelines 2025, Rule 3(2)(b)" that do not appear to
   exist in the real guideline document. Fabricated citations are the single worst
   possible defect in this product. Never invent a clause number, anywhere.
2. The committed SQL does not match the live database. generate_embeddings.py
   reads and writes an `embedding` column, but
   data/datasets/dataset1/database/01_schema.sql declares no such column,
   02_indexes.sql creates only the pg_trgm extension with no pgvector extension
   and no HNSW index, and 03_search.sql is empty. The embeddings exist on one
   laptop but cannot be rebuilt from this repository.
3. The PRD text says the frontend is Next.js. It is actually Vite + React.
   Do NOT migrate it. Keep Vite.
4. The dataset is 100% Latin script. The `title_transliterated` column currently
   just lowercases already-Latin text; it is not real cross-script transliteration.

## TEAM AND FILE OWNERSHIP

Six people work in this repo at the same time. Each owns folders nobody else edits:

| Person | Owns |
|---|---|
| Divvye | contracts/, backend/, ml/fusion/, ml/similarity/semantic.py, ml/registry.py, contracts/fixtures/, ml/config/, docs/ |
| Jai | ml/similarity/lexical.py, phonetic.py, core_word.py, ml/scoring.py, search/ |
| Pruthviraj | rules/, ml/rules/, data/datasets/dataset2/, data/eval/ |
| Suhani | agents/, ml/rag/, presentation/ |
| Gurpreet | frontend/src/api/, frontend/src/hooks/, frontend/src/utils/, frontend/src/App.tsx, frontend/src/components/verifier/, frontend/src/components/agents/, infra/ |
| Darsh | frontend/src/components/officer/, frontend/src/components/registry/, frontend/src/export/, frontend/tests/ |

Shared files needing the owner's permission before editing:
`contracts/*`, `config/weights.yaml`, `config/stopwords.txt`,
`frontend/src/types/index.ts`, `infra/docker-compose.yml`, `README.md`

## GIT — THE BRANCH STRUCTURE DOES NOT CHANGE

`main` is the only long-lived branch and it stays that way. The repo's history
already shows the pattern we keep using: a topic branch opened a pull request
that was merged into `main` (PR #2, from the `data` branch).

- There is no `dev` branch. Do not create one.
- Never commit directly to `main`.
- Each person has ONE topic branch named after their area, kept for all three
  days: contracts-backend (Divvye), algorithms (Jai), rules (Pruthviraj),
  agents (Suhani), frontend-integration (Gurpreet), officer-ui (Darsh).
  Do not create a new branch per task.
- Open several small pull requests from that branch into `main`. Divvye reviews
  and merges, exactly as PR #2 already did.
- Because `main` is also the demo branch, a known-good commit is tagged at each
  checkpoint (`checkpoint-1`, `checkpoint-2`, then `v1.0-demo`). If `main` ever
  breaks, check out the last tag.

## HARD RULES FOR ALL CODE IN THIS REPO

- Every similarity score is a float from 0 to 100. Never 0 to 1.
- Every timestamp is ISO 8601 UTC.
- JSON field names are camelCase (the frontend already uses camelCase).
  In Pydantic use `alias_generator=to_camel` with `populate_by_name=True`.
- Errors are structured: `{"error": {"code": "TITLE_EMPTY", "message": "..."}}`.
  Never expose a raw stack trace to the client.
- No secrets, API keys or connection strings in source code. Use .env only.
- Never invent a legal citation. If you cannot find the real clause text, mark
  it unverified and say so.
- Never run `git add .`. Always name the specific files you are adding.
  This repo already contains 30 MB of CSVs and a 20 MB PDF.
- Prefer extending an existing working file over writing a new one from scratch.

## MY ROLE (Darsh — Officer Review Docket, Registry Explorer, Export & Tests)

I am Darsh. I build the officer-facing half of the product, the exportable official
memorandum, and the automated tests. I own:
  - `frontend/src/components/officer/`   the Officer Review Docket
  - `frontend/src/components/registry/`  the Title Master Registry Explorer
  - `frontend/src/export/`               the exportable official memorandum
  - `frontend/tests/`                    Playwright end-to-end tests

IMPORTANT: the frontend is already built and looks good. I must not restyle it,
not change the theme, and not touch files outside my folders.
Gurpreet owns `App.tsx`, `VerificationView` and the API layer. If I need a change
there, I ask him.
All of my work reads from fixture JSON files first, so I never have to wait for the
backend to exist. On day 3 I swap the data source and the UI does not change.
