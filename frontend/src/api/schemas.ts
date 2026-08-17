/**
 * PRGI TitleGuard — Request & Response Contracts (Zod Runtime Validation + Inferred Types)
 * Direct runtime mirror of contracts/contracts.js and contracts/contracts.py.
 * Every similarity score is validated on a float 0-100 scale.
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
// Stage 5 — EXPLAIN / Full Verdict
// ---------------------------------------------------------------------------
export const ClashingTitleSchema = z.object({
  title: z.string(),
  regNo: z.string(),
  language: z.string(),
  state: z.string(),
  similarity: score(),
  matchType: z.enum(['LEXICAL', 'PHONETIC', 'SEMANTIC', 'CORE_WORD', 'COMBINATION']),
  matchedCoreWord: z.string().optional().nullable(),
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

  stageTimings: z.record(z.string(), z.number()),
  engine: z.enum(['LIVE', 'OFFLINE']),
  cached: z.boolean().default(false),
  processingTimeMs: z.number(),
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
  submissionDate: z.string(),
  riskScore: score(),
  verdict: z.enum(['APPROVED', 'MANUAL_REVIEW', 'REJECTED']),
  primaryConflict: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  copilotDecisionNote: z.string().optional().nullable(),
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
  publisher: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  periodicity: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Structured Errors
// ---------------------------------------------------------------------------
export const ApiErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  error: ApiErrorDetailSchema,
});

// ---------------------------------------------------------------------------
// Endpoint Request & Response Envelopes
// ---------------------------------------------------------------------------
export const VerifyRequestSchema = z.object({
  title: z.string(),
  language: z.string().optional(),
  state: z.string().optional(),
});

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

export const RuleCheckRequestSchema = z.object({
  title: z.string(),
});

export const RuleCheckResponseSchema = z.object({
  ruleViolations: z.array(RuleViolationSchema),
});

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

export const RegistrySearchResponseSchema = z.object({
  results: z.array(TitleRecordSchema),
  total: z.number().int(),
  page: z.number().int(),
  size: z.number().int(),
});

export const OfficerCasesResponseSchema = z.object({
  cases: z.array(OfficerCaseSchema),
});

export const DraftMemoRequestSchema = z.object({
  caseId: z.string(),
});

export const DraftMemoResponseSchema = z.object({
  memo: z.string(),
});

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  engine: z.enum(['LIVE', 'OFFLINE']).optional(),
});

// ---------------------------------------------------------------------------
// Inferred Compile-Time TypeScript Types
// ---------------------------------------------------------------------------
export type NormalizedTitle = z.infer<typeof NormalizedTitleSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type SimilarityScores = z.infer<typeof SimilarityScoresSchema>;
export type CandidateScore = z.infer<typeof CandidateScoreSchema>;
export type RuleViolation = z.infer<typeof RuleViolationSchema>;
export type ClashingTitle = z.infer<typeof ClashingTitleSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
export type GeneratedCandidate = z.infer<typeof GeneratedCandidateSchema>;
export type OfficerCase = z.infer<typeof OfficerCaseSchema>;
export type TitleRecord = z.infer<typeof TitleRecordSchema>;
export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;
export type ApiErrorPayload = z.infer<typeof ApiErrorSchema>;

export type VerifyRequest = z.infer<typeof VerifyRequestSchema>;
export type CandidatesRequest = z.infer<typeof CandidatesRequestSchema>;
export type CandidatesResponse = z.infer<typeof CandidatesResponseSchema>;
export type ScoreRequestItem = z.infer<typeof ScoreRequestItemSchema>;
export type ScoreRequest = z.infer<typeof ScoreRequestSchema>;
export type TitleScoreResult = z.infer<typeof TitleScoreResultSchema>;
export type ScoreResponse = z.infer<typeof ScoreResponseSchema>;
export type RuleCheckRequest = z.infer<typeof RuleCheckRequestSchema>;
export type RuleCheckResponse = z.infer<typeof RuleCheckResponseSchema>;
export type AlternativesRequest = z.infer<typeof AlternativesRequestSchema>;
export type AlternativesResponse = z.infer<typeof AlternativesResponseSchema>;
export type RegistrySearchResponse = z.infer<typeof RegistrySearchResponseSchema>;
export type OfficerCasesResponse = z.infer<typeof OfficerCasesResponseSchema>;
export type DraftMemoRequest = z.infer<typeof DraftMemoRequestSchema>;
export type DraftMemoResponse = z.infer<typeof DraftMemoResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ---------------------------------------------------------------------------
// Safe Runtime Validation Helper (Degrades Gracefully, Never Crashes)
// ---------------------------------------------------------------------------
export type SafeParseResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: z.ZodError; issues: z.ZodIssue[]; formattedError: string };

/**
 * Validates payload against schema using safeParse.
 * Logs exact field path failures without throwing exceptions.
 */
export function safeValidateContract<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string = 'Contract'
): SafeParseResult<T> {
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const formattedError = parsed.error.issues
    .map((issue) => `[${issue.path.join('.') || 'root'}]: ${issue.message}`)
    .join('; ');

  console.warn(`[Zod Contract Validation Failed] (${context}): ${formattedError}`, {
    issues: parsed.error.issues,
    rawPayload: data,
  });

  return {
    success: false,
    error: parsed.error,
    issues: parsed.error.issues,
    formattedError,
  };
}
