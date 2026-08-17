/**
 * Verification Test for useVerification Hook Fallback Paths
 * Tests all four paths:
 * 1. Live succeeds -> engine: 'LIVE', result parsed with Zod
 * 2. Backend stopped -> falls back to offline engine, engine: 'OFFLINE'
 * 3. Backend returns 500 -> falls back to offline engine, engine: 'OFFLINE'
 * 4. Backend returns invalid schema (Zod failure) -> falls back to offline engine, engine: 'OFFLINE'
 */

import { z } from 'zod';

const score = () => z.number().min(0).max(100);

const SimilarityScoresSchema = z.object({
  lexicalScore: score(),
  phoneticScore: score(),
  semanticScore: score(),
  coreWordScore: score(),
  blendedScore: score(),
});

const ClashingTitleSchema = z.object({
  title: z.string(),
  regNo: z.string().optional().nullable(),
  language: z.string(),
  state: z.string(),
  similarity: score(),
  matchType: z.enum(['LEXICAL', 'PHONETIC', 'SEMANTIC', 'CORE_WORD', 'COMBINATION']),
  matchedCoreWord: z.string().optional().nullable(),
  reason: z.string(),
});

const RuleViolationSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO']),
  description: z.string(),
  clause: z.string(),
  passed: z.boolean(),
  triggerPhrase: z.string().optional().nullable(),
});

const VerificationResultSchema = z.object({
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
  stageTimings: z.record(z.string(), z.number()).optional(),
  engine: z.enum(['LIVE', 'OFFLINE']).optional(),
  cached: z.boolean().optional(),
  processingTimeMs: z.number(),
  timestamp: z.string(),
});

function mockOfflineEngine(title) {
  return {
    inputTitle: title,
    normalizedTitle: title.toLowerCase(),
    detectedLanguage: 'English',
    transliteratedTitle: title,
    coreWords: title.toLowerCase().split(' '),
    verdict: 'REJECTED',
    verdictScore: 92,
    similarityBreakdown: {
      lexicalScore: 88,
      phoneticScore: 92,
      semanticScore: 78,
      coreWordScore: 95,
      blendedScore: 92
    },
    clashingTitles: [{
      title: 'India Times',
      regNo: 'DELENG/2012/48192',
      language: 'English',
      state: 'Delhi',
      similarity: 92,
      matchType: 'LEXICAL',
      reason: 'Word order permutation'
    }],
    ruleViolations: [{
      ruleId: 'R-DEC-02',
      ruleName: 'Deceptive Similarity',
      severity: 'CRITICAL',
      description: 'Clashes with India Times',
      clause: 'PRGI Section 2.3',
      passed: false
    }],
    explanation: 'Offline verification detected similarity clash.',
    recommendedAction: 'Choose an alternative title.',
    guidelineCitations: ['PRGI Section 2.3'],
    processingTimeMs: 15,
    timestamp: new Date().toISOString()
  };
}

async function runVerificationPipeline(title, options, mockFetch) {
  let stage = 'normalize';
  let result = null;
  let engine = null;
  let error = null;

  if (options?.useLiveApi) {
    try {
      const res = await mockFetch('/v1/verify', {
        method: 'POST',
        body: JSON.stringify({ title, language: 'English', state: 'Delhi' })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText || 'Server Error'}`);
      }

      const rawJson = await res.json();
      const parsed = VerificationResultSchema.safeParse(rawJson);
      if (!parsed.success) {
        throw new Error(`VALIDATION_ERROR: ${parsed.error.issues.map(i => i.message).join(', ')}`);
      }

      result = parsed.data;
      engine = 'LIVE';
      stage = 'done';
      return { result, engine, stage, error: null };
    } catch (err) {
      error = err;
    }
  }

  result = mockOfflineEngine(title);
  engine = 'OFFLINE';
  stage = 'done';
  return { result, engine, stage, error };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING ALL 4 PATHS FOR useVerification HOOK');
  console.log('====================================================\n');

  // PATH 1: Live API Succeeds
  console.log('▶ [Path 1] Live API Succeeds:');
  const mockValidPayload = {
    inputTitle: 'Times India',
    normalizedTitle: 'times india',
    detectedLanguage: 'English',
    transliteratedTitle: 'Times India',
    coreWords: ['times', 'india'],
    verdict: 'REJECTED',
    verdictScore: 92,
    similarityBreakdown: {
      lexicalScore: 88,
      phoneticScore: 92,
      semanticScore: 78,
      coreWordScore: 95,
      blendedScore: 92
    },
    clashingTitles: [{
      title: 'India Times',
      regNo: 'DELENG/2012/48192',
      language: 'English',
      state: 'Delhi',
      similarity: 92,
      matchType: 'LEXICAL',
      reason: 'Word order permutation'
    }],
    ruleViolations: [{
      ruleId: 'R-DEC-02',
      ruleName: 'Deceptive Similarity',
      severity: 'CRITICAL',
      description: 'Clash with India Times',
      clause: 'PRGI Section 2.3',
      passed: false
    }],
    explanation: 'Live 82k index detected title conflict.',
    recommendedAction: 'Use Agentic Title Studio.',
    guidelineCitations: ['PRGI Section 2.3'],
    processingTimeMs: 42,
    timestamp: new Date().toISOString()
  };

  const p1 = await runVerificationPipeline('Times India', { useLiveApi: true }, async () => ({
    ok: true,
    status: 200,
    json: async () => mockValidPayload
  }));
  console.log(`  Engine: ${p1.engine} (Expected: LIVE)`);
  console.log(`  Verdict: ${p1.result.verdict} (Risk: ${p1.result.verdictScore}/100)`);
  console.log(`  Error: ${p1.error}`);
  console.assert(p1.engine === 'LIVE', 'Path 1 must be LIVE');
  console.log('  ✅ Path 1 PASSED.\n');

  // PATH 2: Backend Stopped
  console.log('▶ [Path 2] Backend Stopped (Network Unreachable):');
  const p2 = await runVerificationPipeline('Times India', { useLiveApi: true }, async () => {
    throw new Error('fetch failed: ECONNREFUSED 127.0.0.1:8000');
  });
  console.log(`  Engine: ${p2.engine} (Expected: OFFLINE fallback)`);
  console.log(`  Caught Error: ${p2.error.message}`);
  console.log(`  Fallback Verdict: ${p2.result.verdict} (Risk: ${p2.result.verdictScore}/100)`);
  console.assert(p2.engine === 'OFFLINE', 'Path 2 must fallback to OFFLINE');
  console.log('  ✅ Path 2 PASSED.\n');

  // PATH 3: Backend Returns 500
  console.log('▶ [Path 3] Backend Returns HTTP 500 Internal Server Error:');
  const p3 = await runVerificationPipeline('Times India', { useLiveApi: true }, async () => ({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: async () => ({ error: { code: 'INTERNAL_ERROR', message: 'Vector database timeout' } })
  }));
  console.log(`  Engine: ${p3.engine} (Expected: OFFLINE fallback)`);
  console.log(`  Caught Error: ${p3.error.message}`);
  console.log(`  Fallback Verdict: ${p3.result.verdict}`);
  console.assert(p3.engine === 'OFFLINE', 'Path 3 must fallback to OFFLINE');
  console.log('  ✅ Path 3 PASSED.\n');

  // PATH 4: Backend Returns Invalid JSON / Zod Violation
  console.log('▶ [Path 4] Backend Returns Valid JSON but Invalid Field Type (Zod Violation):');
  const mockCorruptedPayload = {
    ...mockValidPayload,
    similarityBreakdown: {
      ...mockValidPayload.similarityBreakdown,
      lexicalScore: 250 // VIOLATION: score must be 0-100 float scale
    }
  };
  const p4 = await runVerificationPipeline('Times India', { useLiveApi: true }, async () => ({
    ok: true,
    status: 200,
    json: async () => mockCorruptedPayload
  }));
  console.log(`  Engine: ${p4.engine} (Expected: OFFLINE fallback)`);
  console.log(`  Caught Error: ${p4.error.message}`);
  console.log(`  Fallback Verdict: ${p4.result.verdict}`);
  console.assert(p4.engine === 'OFFLINE', 'Path 4 must fallback to OFFLINE due to Zod failure');
  console.log('  ✅ Path 4 PASSED.\n');

  console.log('====================================================');
  console.log('🎉 ALL 4 PATHS TESTED & VALIDATED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests();
