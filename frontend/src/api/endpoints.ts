/**
 * PRGI TitleGuard API Endpoints
 * Thin typed endpoint wrappers matching the v1.0.0 contracts.
 * No component calls fetch directly.
 */

import { post, get } from './client';
import {
  type VerifyRequest,
  type VerificationResult,
  VerificationResultSchema,
  type CandidatesRequest,
  type CandidatesResponse,
  CandidatesResponseSchema,
  type ScoreRequest,
  type ScoreResponse,
  ScoreResponseSchema,
  type RuleCheckRequest,
  type RuleCheckResponse,
  RuleCheckResponseSchema,
  type AlternativesRequest,
  type AlternativesResponse,
  AlternativesResponseSchema,
  type RegistrySearchResponse,
  RegistrySearchResponseSchema,
  type OfficerCasesResponse,
  OfficerCasesResponseSchema,
  type DraftMemoRequest,
  type DraftMemoResponse,
  DraftMemoResponseSchema,
  type HealthResponse,
  HealthResponseSchema,
} from './schemas';

/**
 * POST /v1/verify — Full 5-Stage Title Verification Pipeline
 */
export async function verifyTitle(request: VerifyRequest): Promise<VerificationResult> {
  return post<VerificationResult>('/v1/verify', request, VerificationResultSchema);
}

/**
 * POST /v1/candidates — Stage 2 Shortlisting
 */
export async function getCandidates(request: CandidatesRequest): Promise<CandidatesResponse> {
  return post<CandidatesResponse>('/v1/candidates', request, CandidatesResponseSchema);
}

/**
 * POST /v1/score — Stage 3 4-Dimensional Batch Scoring
 */
export async function scoreBatch(request: ScoreRequest): Promise<ScoreResponse> {
  return post<ScoreResponse>('/v1/score', request, ScoreResponseSchema);
}

/**
 * POST /v1/rules/check — Stage 4 Deterministic Statutory PRGI Rules Check
 */
export async function checkRules(request: RuleCheckRequest): Promise<RuleCheckResponse> {
  return post<RuleCheckResponse>('/v1/rules/check', request, RuleCheckResponseSchema);
}

/**
 * POST /v1/alternatives — Agentic Title Studio Generation
 */
export async function generateAlternatives(request: AlternativesRequest): Promise<AlternativesResponse> {
  return post<AlternativesResponse>('/v1/alternatives', request, AlternativesResponseSchema);
}

/**
 * GET /v1/registry/search — Browse & Filter 82k+ Registered Master Titles
 */
export async function searchRegistry(params?: {
  q?: string;
  page?: number;
  size?: number;
}): Promise<RegistrySearchResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.page) query.set('page', String(params.page));
  if (params?.size) query.set('size', String(params.size));

  const path = `/v1/registry/search${query.toString() ? `?${query.toString()}` : ''}`;
  return get<RegistrySearchResponse>(path, RegistrySearchResponseSchema);
}

/**
 * GET /v1/cases — Officer Review Docket Queue
 */
export async function listCases(): Promise<OfficerCasesResponse> {
  return get<OfficerCasesResponse>('/v1/cases', OfficerCasesResponseSchema);
}

/**
 * POST /v1/officer/draft-memo — Officer AI Copilot Decision Drafter
 */
export async function draftMemo(request: DraftMemoRequest): Promise<DraftMemoResponse> {
  return post<DraftMemoResponse>('/v1/officer/draft-memo', request, DraftMemoResponseSchema);
}

/**
 * GET /health — Service Health Status Check
 */
export async function getHealth(): Promise<HealthResponse> {
  return get<HealthResponse>('/health', HealthResponseSchema);
}

// Consolidated API export object
export const api = {
  verifyTitle,
  getCandidates,
  scoreBatch,
  checkRules,
  generateAlternatives,
  searchRegistry,
  listCases,
  draftMemo,
  getHealth,
};

// Attach to window in development for immediate browser console testing
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as unknown as { __api: typeof api }).__api = api;
}
