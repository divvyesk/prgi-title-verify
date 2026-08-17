# AGENTS.md — PRGI TitleGuard project memory

This file is the persistent brief for anyone (human or agent) picking up work in
this repository. It is the full onboarding brief as given to Divvye (integration
lead), preserved in full so future sessions do not need to be re-briefed.

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
- [ ] Prefer extending an existing working file over writing a new one from scratch.
- [ ] Do not restructure the repository: no deleting, renaming, or moving existing
      files/folders (including `contracts/contracts.js`, which stays `.js`).
- [ ] Do not reorganise `data/`, `ml/`, `search/`, `backend/`, or `frontend/`.
- [ ] Stay inside your own file ownership; shared files need the owner's permission.
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

## ALREADY BUILT AND WORKING — REUSE THIS, DO NOT REBUILD OR REPLACE IT

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

## EMPTY FILES THAT ALREADY EXIST — FILL THESE, DO NOT CREATE ALTERNATIVES BESIDE THEM

The repository already has the right file layout; many files are simply 0 bytes.
When a task needs one of these, open THAT file and write into it. Do not create
a differently-named file next to it and leave the empty one behind.

```
backend/app/main.py              the FastAPI app
backend/requirements.txt         Python dependencies
backend/Dockerfile               backend container image
contracts/contracts.py           Pydantic request/response models
contracts/contracts.js           the same shapes as Zod schemas
contracts/algo.py                the interface every algorithm implements
contracts/CHANGELOG.md           contract version history
ml/similarity/lexical.py         lexical scorer
ml/similarity/phonetic.py        phonetic scorer
ml/similarity/core_word.py       core-word scorer
ml/similarity/semantic.py        semantic scorer
ml/scoring.py                    the composite blend
ml/embeddings/generate.py        embedding job for the guideline corpus
search/database/schema.sql       extra search columns
search/database/indexes.sql      extra search indexes
data/datasets/dataset1/database/03_search.sql   the working search queries
docs/API_SPEC.md  docs/ARCHITECTURE.md  docs/DATABASE_SCHEMA.md
docs/GIT_WORKFLOW.md  docs/PRD.md
infra/docker-compose.yml  infra/docker-compose.prod.yml
```

## DO NOT RESTRUCTURE THE REPOSITORY

The folder layout stays exactly as it is. Specifically:

- Do NOT delete any file or folder, even one that looks duplicated or unused.
  `title_master.csv` at the repository root, the PDFs, the .docx files, and
  `search/database/` all stay where they are.
- Do NOT rename or move existing files, including `contracts/contracts.js`
  (it stays .js — the typed frontend mirror lives in frontend/src/api/schemas.ts).
- Do NOT reorganise `data/`, `ml/`, `search/`, `backend/` or `frontend/`.
- New folders are only created inside the existing tree where there is genuinely no
  home for new code, and are listed in each person's own task.

## KNOWN PROBLEMS IN THE EXISTING CODE

1. `frontend/src/utils/rulesEngine.ts` cites legal clauses such as
   "PRGI Digital Alignment Guidelines 2025, Rule 3(2)(b)" that do not appear to
   exist in the real guideline document. Fabricated citations are the worst
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
   just lowercases already-Latin text; it is not real cross-script
   transliteration.

## TEAM AND FILE OWNERSHIP

Six people work in this repo at the same time. Each owns folders nobody else edits:

| Person | Owns |
|---|---|
| Divvye | contracts/, backend/, ml/fusion/, ml/similarity/semantic.py, ml/registry.py, contracts/fixtures/, ml/config/, docs/ |
| Jai | ml/similarity/lexical.py, phonetic.py, core_word.py, ml/scoring.py, search/ |
| Pruthviraj | data/rules/, ml/rules/, ml/embeddings/, data/eval/, data/datasets/ (all of it, including dataset1) |
| Suhani | agents/, ml/rag/, presentation/ |
| Gurpreet | frontend/src/api/, frontend/src/hooks/, frontend/src/utils/, frontend/src/App.tsx, frontend/src/components/verifier/, frontend/src/components/agents/, infra/ |
| Darsh | frontend/src/components/officer/, components/registry/, frontend/src/export/, frontend/tests/ |

Shared files needing the owner's permission before editing:
`contracts/*`, `ml/config/weights.yaml`, `ml/config/stopwords.txt`,
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

## MY ROLE (Divvye — integration lead)

I am Divvye. I am the integration lead. I own:

- `contracts/` : the frozen request/response schemas all six people code
  against, in Python (contracts.py, Pydantic) and JavaScript (contracts.js,
  Zod), plus the Protocol interface every similarity algorithm implements
  (algo.py). All four of these files already exist and are empty — I fill them.
- `contracts/fixtures/` : hand-written example JSON matching those contracts,
  so the other five people can build against realistic data before any real
  code exists.
- `backend/` : the FastAPI service that orchestrates the 5-stage pipeline and
  exposes it as a versioned /v1 API. backend/app/main.py already exists, empty.
- `ml/similarity/semantic.py` (exists, empty) and `ml/fusion/` : the semantic
  scorer, which QUERIES the BGE-M3 embeddings that are already generated and
  indexed, and the code that merges several ranked candidate lists into one
  shortlist.
- `docs/` : five empty markdown files I fill.

I also review every pull request and own `main`.

My first three hours are the most important hours on the team, because until
contracts and fixtures exist, five other people are guessing.
