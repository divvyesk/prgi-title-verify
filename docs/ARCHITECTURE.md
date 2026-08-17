# Architecture

## The 5-stage pipeline

Every `POST /v1/verify` call runs the same five stages, in order. `backend/app/services/pipeline.py`
is the orchestrator — nothing else in the codebase calls a scorer or retriever directly.

```
  title
    |
    v
[1] NORMALIZE          lowercase, whitespace-collapse, stopword-strip core words
    |                   (real always — plain string processing, no ML/DB)
    v
[2] SHORTLIST           every registered CandidateRetriever runs concurrently
    |                    (asyncio.gather + asyncio.to_thread — each retriever's
    |                    search() is a sync, blocking DB call), ranked ID lists
    |                    merged with Reciprocal Rank Fusion (ml/fusion/rrf.py),
    |                    top 200 hydrated in ONE query (WHERE title_id = ANY(%s))
    v
[3] SCORE                every registered SimilarityScorer.score_batch() runs
    |                     against the shortlist; per-dimension scores blended
    |                     with ml/config/weights.yaml, renormalized across only
    |                     the dimensions actually registered
    v
[4] CHECK (rules)        deterministic rule engine — CRITICAL violations force
    |                     REJECTED regardless of the similarity verdict
    v
[5] EXPLAIN               verdict/verdictScore/similarityBreakdown/clashingTitles
                          assembled from stage 2-3 output + weights.yaml thresholds
                          (real the moment shortlist+score are real); prose
                          (explanation/recommendedAction/citations) separately
                          gated — templated until ml/rag/explain.py lands
    |
    v
  VerificationResult (contracts/contracts.py)
```

An in-process LRU cache sits in front of stage 1, keyed on the normalized title —
see `docs/API_SPEC.md` for details.

## Dynamic registry — how the pipeline survives an unfinished teammate module

`ml/registry.py` builds `SCORERS: dict[str, SimilarityScorer]` and
`RETRIEVERS: dict[str, CandidateRetriever]` by trying to import each expected module
inside its own `try/except`. An empty placeholder file and a module that doesn't
exist yet both fail exactly the same safe way: logged, skipped, moved on. Whatever
ends up registered is what stages 2-3 actually run — nothing elsewhere needs to
change as pieces land.

Four more integration points in `pipeline.py`/`routers/alternatives.py` follow the
same pattern for modules that aren't part of the scorer/retriever registry:
`ml/rules/engine.py` (stage 4), `ml/rag/explain.py` (stage 5 prose),
`ml/scoring.py` (stage 3, meant to eventually replace the inline blending bridge
in `pipeline.py`), and `agents/studio.py` (`/v1/alternatives`). Each is attempted
once at import/startup time; on failure, a warning is logged and that piece stays
on stub/fixture data. Per-call failures (a module imports fine but raises when
actually invoked) fall back the same way, per-request, without crashing the pipeline.

### The cost of that resilience, and what it means for you

This design keeps a broken teammate module from taking down the server. It also
hides the breakage, and during integration it hid four separate faults at once —
each of which returned HTTP 200 with plausible output:

- all four retrievers failed to register (wrong DB driver, an import that only
  resolves inside the server, a missing module-level `RETRIEVER`), so
  shortlisting silently ran on nothing;
- `run_rules()` raised `ValidationError` on every title from a field-name
  mismatch, so all 36 rules were evaluated and discarded, and every response
  reported zero rule violations;
- `/v1/alternatives` called `run_studio()` with the wrong signature and served
  fixtures instead — returning Maharashtra titles for a Tamil Nadu request;
- the frontend rejected a valid response over a `null` vs `undefined` schema
  detail and quietly dropped to its offline engine while still displaying a
  "Live API" badge.

So: **treat the fallbacks as alarms, not as safety.** On boot, check the
registry line in the logs actually reads `4/4 scorers, 4/4 retrievers`, and
grep the log for `falling back` after exercising an endpoint. A green response
is not evidence that the real path ran.

## Layer ownership

Matches `.github/CODEOWNERS` — the map below is the same thing, read top-down as a
request flows through the system.

```
frontend/                     Gurpreet (integration layer), Darsh (officer/registry UI)
  └─ calls ──────────────────────────────────────────┐
                                                       v
backend/app/                  Divvye — FastAPI app, routers, the 5-stage orchestrator
  ├─ routers/                 one file per endpoint, contracts/contracts.py models
  │                           as response_model
  ├─ services/pipeline.py     the orchestrator described above
  ├─ services/stub.py         fixture-backed fallback for every stage
  └─ db.py                    the one psycopg connection pool
       |
       v
ml/registry.py                Divvye — dynamic SCORERS/RETRIEVERS lookup
  ├─ ml/similarity/
  │   ├─ semantic.py          Divvye — BGE-M3 wrapper
  │   ├─ lexical.py           Jai — RapidFuzz (ratio/token-sort/partial)
  │   ├─ phonetic.py          Jai — sounds-alike matching
  │   └─ core_word.py         Jai — stopword-stripped root comparison
  ├─ ml/fusion/rrf.py         Divvye — Reciprocal Rank Fusion
  ├─ ml/scoring.py            Jai — composite scorer (bridge lives in pipeline.py until this lands)
  ├─ ml/rules/                Pruthviraj — deterministic rule engine
  └─ ml/rag/                  Suhani — retrieval-grounded explanation
       |
       v
search/retrievers/            Jai (trigram, bm25, phonetic), Divvye (vector)
  └─ queries ─────────────────┐
                               v
data/ + Postgres (pg_trgm, pgvector/HNSW)     Pruthviraj — schema, embeddings, eval set

agents/                       Suhani — LangGraph 4-agent Title Studio
contracts/                    Divvye — frozen Pydantic + Zod models, the one thing
                               everyone reads and nobody changes without a
                               contracts/CHANGELOG.md entry
```

## Known performance characteristics (measured, not estimated)

Measured after integration, against the full 82,713-title corpus with all four
scorers and all four retrievers registered (`STUB_MODE=0`):

- cached demo titles: **~1ms** (median over the pre-warmed set)
- cold, never-seen titles: **3.4-5.3s**, median 3.8s

Per-stage, on a cold title:

- `normalize`: <1ms
- `shortlist`: ~1.7s — four retrievers (trigram, bm25, phonetic, vector) fused
  with RRF, returning 200 candidates
- `score`: ~2.2s — still the dominant cost, and still dominated by the semantic
  dimension's `SentenceTransformer.encode()` over the shortlist. Jai's RapidFuzz
  scorers did land and now run alongside it; they are close to free, so the
  earlier prediction that adding them would reduce total time was wrong. The
  cost was never spread across dimensions — it is one model call, and it stays.
- `check`: ~3-10ms — the real 36-rule engine, not the stub
- `explain`: ~1.1s — a real Groq call plus RAG retrieval

The cache (see `docs/API_SPEC.md`) is what gets the six demo titles under budget
for judges — pre-warmed at startup, they answer in about a millisecond.

Two operational notes worth knowing before a demo:

- **Never run `scripts/embed_titles.py` while demoing.** It competes with the
  backend for the GPU. A verification that normally takes 5s was measured at
  **194s** while the embedding pass was running.
- The frontend's "sub-2 seconds" headline describes the cached path. A cold
  title takes ~4s.
