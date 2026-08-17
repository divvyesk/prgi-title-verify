# Contracts Changelog

Every change to `contracts/contracts.py`, `contracts/contracts.js`, or
`contracts/algo.py` gets an entry here, in the same pull request as the
change itself. A contract change is never bundled with unrelated feature
work — it's its own small PR, reviewed by Divvye, so everyone downstream
knows exactly when and why a shape they depend on moved.

Format: newest entry first. State what changed and why, not just what.

---

## v1.0.0 — 2026-08-17

Initial freeze. Everything below is new.

**contracts.py / contracts.js** (field-for-field identical, camelCase on
the wire):

- `NormalizedTitle` — Stage 1 output.
- `Candidate` — one row from a `CandidateRetriever`, Stage 2 output.
- `SimilarityScores` — the 4-D breakdown (lexical/phonetic/semantic/
  core-word) plus the blended composite. Every field 0–100, never 0–1.
- `CandidateScore` — one candidate's full `SimilarityScores`, used in batch
  scoring responses.
- `RuleViolation` — one deterministic rule's outcome, including the
  `requiresHumanConfirmation` flag for the one LLM-assisted rule category
  (PRD §6.4).
- `ClashingTitle` — one conflicting registered title, with its match type
  and a plain-language reason.
- `VerificationResult` — the full `/v1/verify` response, Stages 1–5. Adds
  three fields the frontend's existing `VerificationResult` type
  (`frontend/src/types/index.ts`) doesn't have yet: `stageTimings`
  (per-stage milliseconds), `engine` (`LIVE`/`OFFLINE`, so the UI can badge
  which dataset produced a verdict), and `cached` (whether this response
  came from the LRU cache rather than a fresh pipeline run).
- `GeneratedCandidate` — one Agentic Studio suggestion. `verificationPassed`
  is always `true` for anything actually returned — the Verifier agent
  discards failures before the Ranker sees them.
- `OfficerCase` — one row in the Officer Review Docket.
- `TitleRecord` — one row in the Registry Explorer (display-facing; dates
  stay plain strings, unlike the stricter `OfficerCase.submissionDate`).
- `ApiErrorDetail` / `ApiError` — the structured `{error: {code, message}}`
  shape every error response uses. Never a raw stack trace.
- Per-endpoint request/response envelopes: `VerifyRequest`,
  `CandidatesRequest`/`CandidatesResponse`, `ScoreRequestItem`/
  `ScoreRequest`/`TitleScoreResult`/`ScoreResponse`, `RuleCheckRequest`/
  `RuleCheckResponse`, `AlternativesRequest`/`AlternativesResponse`,
  `RegistrySearchResponse`, `OfficerCasesResponse`, `DraftMemoRequest`/
  `DraftMemoResponse`, `HealthResponse`.

  Note on `ScoreRequest`: it takes a list of `{title, candidates}` items
  rather than a single title, so this one endpoint covers both the normal
  verify path (one item) and the Agentic Studio's need to batch-score
  15–20 generated titles in a single round trip (PRD §11.1 — never one
  request per candidate). This was designed in from the start specifically
  so it never needs a breaking change later.

**algo.py**:

- `SimilarityScorer` Protocol — `name`, `version`, `score()`,
  `score_batch()`, `explain()`. Implemented by
  `ml/similarity/{lexical,phonetic,semantic,core_word}.py`.
- `CandidateRetriever` Protocol — `name`, `search()`. Implemented by the
  trigram/BM25/phonetic/vector retrievers under `search/retrievers/`.
- Both are `@runtime_checkable`, so `isinstance(x, SimilarityScorer)` works
  for a quick sanity check without requiring explicit inheritance.

**Endpoints these contracts imply** (backend/app/routers/, Prompt 4):

```
POST /v1/verify              full pipeline, Stages 1-5
POST /v1/candidates          Stage 2 only
POST /v1/score                Stage 3 only, batch-capable
POST /v1/rules/check          Stage 4 only
POST /v1/alternatives          Agentic Title Studio
GET  /v1/registry/search      Title Master Registry Explorer
GET  /v1/cases                 Officer Review Docket
POST /v1/officer/draft-memo   AI Copilot Decision Drafter
GET  /health
```

**Source of truth**: `frontend/src/types/index.ts` (already shipping,
already camelCase) was the starting point — every shape above matches it
field for field except where noted.
