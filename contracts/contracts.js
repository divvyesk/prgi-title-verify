/**
 * Shared request/response contracts for the PRGI TitleGuard API — the Zod
 * runtime-validation mirror of contracts/contracts.py.
 *
 * This file must define the exact same shapes as contracts.py, field for
 * field, in the same camelCase the backend already emits (Pydantic's
 * alias_generator produces camelCase JSON, so no translation happens here —
 * these field names ARE the wire format). If you change a shape in
 * contracts.py, change it here too, in the same pull request, with a
 * contracts/CHANGELOG.md entry.
 *
 * Deliberately plain JavaScript, not TypeScript: this file only defines
 * runtime schemas. Gurpreet's frontend/src/api/schemas.ts imports these and
 * calls z.infer<> there to get compile-time types — that inference step
 * does not belong in this file, so this file has zero frontend-specific
 * dependencies beyond zod itself.
 *
 * Every score is z.number().min(0).max(100) — never 0 to 1. Zod validates
 * this at runtime the same way Pydantic's Field(ge=0, le=100) does on the
 * backend, so a malformed response fails loudly instead of silently
 * rendering a broken score bar.
 */

import { z } from 'zod';

const score = () => z.number().min(0).max(100);

// ---------------------------------------------------------------------------
// Stage 1 — NORMALIZE
// ---------------------------------------------------------------------------

export const NormalizedTitleSchema = z.object({
  inputTitle: z.string(),
  normalizedTitle: z.string(),
  detectedLanguage: z.string(),
  detectedScript: z.string(),
  transliteratedTitle: z.string(),
  coreWords: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// Stage 2 — SHORTLIST
// ---------------------------------------------------------------------------

export const CandidateSchema = z.object({
  titleId: z.number().int(),
  title: z.string(),
  regNo: z.string(),
  language: z.string(),
  state: z.string(),
  rawScore: z.number().min(0).max(1),
  source: z.enum(['trigram', 'bm25', 'phonetic', 'vector']),
});

// ---------------------------------------------------------------------------
// Stage 3 — SCORE
// ---------------------------------------------------------------------------

export const SimilarityScoresSchema = z.object({
  lexicalScore: score(),
  phoneticScore: score(),
  semanticScore: score(),
  coreWordScore: score(),
  blendedScore: score(),
});

export const CandidateScoreSchema = z.object({
  candidate: z.string(),
  scores: SimilarityScoresSchema,
});

// ---------------------------------------------------------------------------
// Stage 4 — CHECK
// ---------------------------------------------------------------------------

export const RuleViolationSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
  description: z.string(),
  clause: z.string(),
  passed: z.boolean(),
  triggerPhrase: z.string().optional(),
  requiresHumanConfirmation: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Stage 5 — EXPLAIN / full verdict
// ---------------------------------------------------------------------------

export const ClashingTitleSchema = z.object({
  title: z.string(),
  regNo: z.string(),
  language: z.string(),
  state: z.string(),
  similarity: score(),
  matchType: z.enum(['LEXICAL', 'PHONETIC', 'SEMANTIC', 'CORE_WORD', 'COMBINATION']),
  matchedCoreWord: z.string().optional(),
  reason: z.string(),
});

export const VerificationResultSchema = z.object({
  inputTitle: z.string(),
  normalizedTitle: z.string(),
  detectedLanguage: z.string(),
  transliteratedTitle: z.string(),
  coreWords: z.array(z.string()),

  verdict: z.enum(['APPROVED', 'MANUAL_REVIEW', 'REJECTED']),
  verdictScore: score(),
  similarityBreakdown: SimilarityScoresSchema,
  clashingTitles: z.array(ClashingTitleSchema),
  ruleViolations: z.array(RuleViolationSchema),

  explanation: z.string(),
  recommendedAction: z.string(),
  guidelineCitations: z.array(z.string()),

  // Milliseconds per stage, e.g. { normalize: 3.1, shortlist: 42.0, ... }
  stageTimings: z.record(z.string(), z.number()),
  engine: z.enum(['LIVE', 'OFFLINE']),
  cached: z.boolean().default(false),
  processingTimeMs: z.number().int(),
  // Backend sends a strict ISO-8601 datetime (Pydantic's `datetime` type is
  // the authority on format); Zod only checks that it's a non-empty string.
  timestamp: z.string(),
});

// ---------------------------------------------------------------------------
// Agentic Title Studio
// ---------------------------------------------------------------------------

export const GeneratedCandidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  meaning: z.string(),
  uniquenessScore: score(),
  verificationPassed: z.boolean(),
  riskScore: score(),
  category: z.string(),
  rationale: z.string(),
});

// ---------------------------------------------------------------------------
// Officer Review Docket
// ---------------------------------------------------------------------------

export const OfficerCaseSchema = z.object({
  id: z.string(),
  applicantName: z.string(),
  proposedTitle: z.string(),
  language: z.string(),
  state: z.string(),
  periodicity: z.string(),
  // Backend sends a plain "YYYY-MM-DD" date string (Pydantic's `date` type
  // is the authority on format).
  submissionDate: z.string(),
  riskScore: score(),
  verdict: z.enum(['APPROVED', 'MANUAL_REVIEW', 'REJECTED']),
  primaryConflict: z.string().optional(),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  copilotDecisionNote: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Title Master Registry Explorer
// ---------------------------------------------------------------------------

export const TitleRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  language: z.string(),
  state: z.string(),
  regNo: z.string(),
  regDate: z.string(),
  publisher: z.string().optional(),
  owner: z.string().optional(),
  periodicity: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const ApiErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  error: ApiErrorDetailSchema,
});

// ---------------------------------------------------------------------------
// Per-endpoint request / response envelopes
// ---------------------------------------------------------------------------

// POST /v1/verify
export const VerifyRequestSchema = z.object({
  title: z.string(),
  language: z.string().optional(),
  state: z.string().optional(),
});

// POST /v1/candidates — Stage 2 only.
export const CandidatesRequestSchema = z.object({
  title: z.string(),
  limit: z.number().int().min(1).max(1000).default(200),
});

export const CandidatesResponseSchema = z.object({
  candidates: z.array(CandidateSchema),
});

export const ScoreRequestItemSchema = z.object({
  title: z.string(),
  candidates: z.array(z.string()),
});

// POST /v1/score — Stage 3 only. `items` is an array so this endpoint can
// score ONE title against its candidates (the normal verify path) or MANY
// titles in a single round trip (the Agentic Studio scoring 15-20 generated
// candidates at once — batched, never one request per candidate).
export const ScoreRequestSchema = z.object({
  items: z.array(ScoreRequestItemSchema),
});

export const TitleScoreResultSchema = z.object({
  title: z.string(),
  candidateScores: z.array(CandidateScoreSchema),
});

export const ScoreResponseSchema = z.object({
  results: z.array(TitleScoreResultSchema),
});

// POST /v1/rules/check — Stage 4 only.
export const RuleCheckRequestSchema = z.object({
  title: z.string(),
});

export const RuleCheckResponseSchema = z.object({
  ruleViolations: z.array(RuleViolationSchema),
});

// POST /v1/alternatives — the Agentic Title Studio
export const AlternativesRequestSchema = z.object({
  genre: z.string(),
  state: z.string(),
  language: z.string(),
  tone: z.string().optional(),
  audience: z.string().optional(),
});

export const AlternativesResponseSchema = z.object({
  candidates: z.array(GeneratedCandidateSchema),
});

// GET /v1/registry/search
export const RegistrySearchResponseSchema = z.object({
  results: z.array(TitleRecordSchema),
  total: z.number().int(),
  page: z.number().int(),
  size: z.number().int(),
});

// GET /v1/cases
export const OfficerCasesResponseSchema = z.object({
  cases: z.array(OfficerCaseSchema),
});

// POST /v1/officer/draft-memo
export const DraftMemoRequestSchema = z.object({
  caseId: z.string(),
});

export const DraftMemoResponseSchema = z.object({
  memo: z.string(),
});

// GET /health
export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  engine: z.enum(['LIVE', 'OFFLINE']).optional(),
});
