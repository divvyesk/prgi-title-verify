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

A full real `/v1/verify` (uncached, `STUB_MODE=0`) currently takes **2.2-4.3 seconds**
— over the 2-second target. Breakdown from real `stageTimings` measurements:

- `normalize`: <1ms
- `shortlist`: 60-140ms (one DB round trip via the vector retriever + RRF)
- `score`: **2.1-2.6s** — the dominant cost. A single `SentenceTransformer.encode()`
  batch call over ~200 shortlisted candidates, the only scoring dimension currently
  registered. This is expected to fall once Jai's fast, C++-backed RapidFuzz-based
  scorers (lexical/phonetic/core_word) also register — the pipeline doesn't get
  slower as more scorers are added (each runs independently), but today's number
  reflects the whole scoring burden sitting on the one slowest dimension.
- `check`: <3ms (stub keyword match; real rule engine not wired yet)
- `explain`: <1ms (fixed in Prompt 7 — this used to cost ~630ms by redundantly
  re-running the model per clashing title; now reuses scores already computed in
  stage 3)

The cache (see `docs/API_SPEC.md`) is what actually gets the six demo titles under
budget for judges — pre-warmed at startup, they answer in 0-2ms.
