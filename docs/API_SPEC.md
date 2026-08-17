# API Spec

FastAPI generates the full interactive spec for free from `contracts/contracts.py` —
that's the source of truth for exact field names, types and validation rules.

- **Interactive docs (Swagger UI):** `http://localhost:8000/docs`
- **Raw OpenAPI JSON:** `http://localhost:8000/openapi.json`
- **ReDoc (read-only, nicer for browsing):** `http://localhost:8000/redoc`

Everything below is what those pages can't tell you: the business logic behind the
shapes, not the shapes themselves.

## Endpoints

| Method | Path | Stage(s) | Real as of |
|---|---|---|---|
| `POST` | `/v1/verify` | 1-5, full pipeline | Prompt 6 (shortlist/score), Prompt 7 (cache/warm-up) |
| `POST` | `/v1/candidates` | 2 only | Prompt 6 |
| `POST` | `/v1/score` | 3 only, batch-capable | Prompt 6 |
| `POST` | `/v1/rules/check` | 4 only | Stub — `ml/rules/engine.py` not merged yet |
| `POST` | `/v1/alternatives` | Agentic Title Studio | Stub — `agents/studio.py` not merged yet |
| `GET` | `/v1/registry/search` | Title Master Registry Explorer | Real — queries `title_master.csv` directly |
| `GET` | `/v1/cases` | Officer Review Docket | Stub — fixture data |
| `POST` | `/v1/officer/draft-memo` | AI Copilot Decision Drafter | Stub — templated from fixture case data |
| `GET` | `/health` | — | Real |

## Verdict thresholds

From `ml/config/weights.yaml`, read once at process start:

```yaml
weights:
  lexical: 0.30
  phonetic: 0.25
  semantic: 0.30
  core_word: 0.15
thresholds:
  reject: 75        # blended composite >= 75  -> REJECTED
  review: 45        # blended composite >= 45  -> MANUAL_REVIEW
                     # below 45                -> APPROVED
max_signal_override: 90   # any single dimension >= 90 floors the composite at 85,
                           # even if the blended average alone wouldn't reach REJECTED
```

**Weight renormalization**: only dimensions with a scorer actually registered in
`ml/registry.py` count toward the blend, and the configured weights above are
rescaled to sum to 1.0 across just those. A missing dimension does **not** default
into the weighted sum as 0.0 — that would silently read as "measured no similarity"
and drag every score down, a false negative baked into the math. Today only
`semantic` is registered, so `blended_score == semantic_score` exactly; the
configured 30/25/30/15 split takes effect automatically the moment more scorers
register, no code change required.

## STUB_MODE and per-stage flags

`STUB_MODE` (env var, default `1`) is the one switch controlling whether the process
touches anything heavy — the database and the ~2GB BGE-M3 model. `STUB_MODE=1` means
neither is ever opened/loaded; every response is fixture-derived. Every teammate's
`uvicorn --reload` should stay on `STUB_MODE=1` unless they specifically need the real
engine running locally.

Independently, `backend/app/services/pipeline.py`'s `STUB` dict has one flag per
pipeline stage (`shortlist`, `score`, `rules`, `explain`):

- `shortlist`/`score` default to `STUB_MODE`'s value.
- `rules`/`explain` are independent of `STUB_MODE` — each defaults to stubbed unless
  the corresponding real module (`ml/rules/engine.py`, `ml/rag/explain.py`)
  successfully imports at process start. Check the startup log for
  `"<module> not available"` warnings to see what's currently wired.

This is the demo-day insurance policy: if a teammate's module breaks mid-demo, flip
that one flag back to `True` in `pipeline.py` and the demo keeps running.

**`explain` only ever governs prose** (`explanation` / `recommendedAction` /
`guidelineCitations`), never the verdict itself. `verdict`, `verdictScore`,
`similarityBreakdown` and `clashingTitles` are computed for real from whatever
`shortlist`/`score` actually produced, regardless of the `explain` flag.

**Exception**: when *both* `shortlist` and `score` are stubbed (the full offline
baseline — `STUB_MODE=1`'s default state), `/v1/verify` uses a curated fixture
lookup instead of assembling a verdict from fake data: three exact-match titles
("Aditi National Strategy Review", "Jaagran", "Royal Matrimonial Classifieds") return
their specific demo-scripted verdict; anything else gets a deterministic hash-bucketed
pick among the three, with the response's own title/normalized-title fields honestly
reflecting what was actually submitted.

## Caching

An in-process LRU cache (max 256 entries, keyed on the normalized title) sits in
front of the full pipeline in `/v1/verify`. Pre-warmed at startup (when
`STUB_MODE=0`) with the six demo titles, so they answer in single-digit
milliseconds regardless of what the rest of the pipeline costs. The response's
`cached` field is always accurate — `true` only when this request was actually
served from the cache, never hardcoded.

## `engine` field

- `"LIVE"` — this response came from the real pipeline (at least `shortlist` or
  `score` was real).
- `"OFFLINE"` — both `shortlist` and `score` were stubbed; this is fixture-derived
  data, not a live measurement.

## Error codes

Every error response is `{"error": {"code": "...", "message": "..."}}` — never a raw
stack trace. Codes currently in use:

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body fails Pydantic validation (missing/wrong-typed field) |
| `CASE_NOT_FOUND` | 404 | `POST /v1/officer/draft-memo` with an unknown `caseId` |
| `HTTP_ERROR` | 404 (or other) | Any other HTTP-level error, including an unmatched route |
| `INTERNAL` | 500 | An unhandled exception. Logged server-side with a traceback; the client never sees one. |

## Request-ID logging and privacy

Every `/v1/verify` call gets a UUID logged at each stage transition
(`app.services.pipeline` logger, `INFO` level) — useful for correlating one request's
timing across `normalize`/`shortlist`/`score`/`check`/`explain` in the logs. **The raw
submitted title is never logged at `INFO` level anywhere in the pipeline** — only its
length and a truncated SHA-256 hash (`fp=...` in log lines). This is a privacy
requirement, not a style preference; if you add a new log line touching a title,
follow the same convention.
