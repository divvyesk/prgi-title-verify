/**
 * PRGI TitleGuard — Unified Title Verification Hook
 * Single source of truth for 5-stage title verification across the app.
 *
 * Behaviour:
 * - Attempts the Live FastAPI backend (/v1/verify) when useLiveApi is enabled
 * - On ANY failure (network error, timeout, HTTP 500, Zod schema mismatch),
 *   automatically falls back to the embedded offline engine (runTitleVerification)
 * - Tracks stage: 'idle' | 'normalize' | 'shortlist' | 'score' | 'check' | 'explain' | 'done'
 * - Never throws to the caller; failures are recorded in `error`
 * - Exposes active `engine`: 'LIVE' | 'OFFLINE' | null
 */

import { useState, useCallback, useRef } from 'react';
import type { VerificationResult } from '../types';
import { verifyTitle } from '../api/endpoints';
import { runTitleVerification } from '../utils/verificationEngine';
import { ApiError } from '../api/client';

export type VerificationStage =
  | 'idle'
  | 'normalize'
  | 'shortlist'
  | 'score'
  | 'check'
  | 'explain'
  | 'done';

export type VerificationEngine = 'LIVE' | 'OFFLINE' | null;

export interface UseVerificationOptions {
  language?: string;
  state?: string;
  useLiveApi?: boolean;
}

export interface UseVerificationReturn {
  run: (title: string, options?: UseVerificationOptions) => Promise<VerificationResult>;
  stage: VerificationStage;
  result: VerificationResult | null;
  engine: VerificationEngine;
  error: ApiError | Error | null;
  isRunning: boolean;
  reset: () => void;
}

export function useVerification(initialResult: VerificationResult | null = null): UseVerificationReturn {
  const [stage, setStage] = useState<VerificationStage>(initialResult ? 'done' : 'idle');
  const [result, setResult] = useState<VerificationResult | null>(initialResult);
  const [engine, setEngine] = useState<VerificationEngine>(initialResult ? 'OFFLINE' : null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Keep a ref to track request sequence / avoid race conditions
  const currentRunId = useRef<number>(0);

  const reset = useCallback(() => {
    setStage('idle');
    setResult(null);
    setEngine(null);
    setError(null);
    setIsRunning(false);
  }, []);

  const run = useCallback(
    async (title: string, options?: UseVerificationOptions): Promise<VerificationResult> => {
      const cleanTitle = (title || '').trim();
      const runId = ++currentRunId.current;

      setIsRunning(true);
      setError(null);
      setStage('normalize');

      const targetLanguage = options?.language || 'English';
      const targetState = options?.state || 'Delhi';
      const tryLive = Boolean(options?.useLiveApi);

      // Advance stage telemetry smoothly
      const t1 = setTimeout(() => {
        if (currentRunId.current === runId) setStage('shortlist');
      }, 70);
      const t2 = setTimeout(() => {
        if (currentRunId.current === runId) setStage('score');
      }, 140);
      const t3 = setTimeout(() => {
        if (currentRunId.current === runId) setStage('check');
      }, 210);
      const t4 = setTimeout(() => {
        if (currentRunId.current === runId) setStage('explain');
      }, 280);

      try {
        if (tryLive) {
          try {
            // Attempt Live FastAPI Backend
            const liveResult = await verifyTitle({
              title: cleanTitle,
              language: targetLanguage,
              state: targetState,
            });

            if (currentRunId.current === runId) {
              clearTimeout(t1);
              clearTimeout(t2);
              clearTimeout(t3);
              clearTimeout(t4);

              // Map live result ensuring contract compatibility
              const finalResult: VerificationResult = {
                inputTitle: liveResult.inputTitle,
                normalizedTitle: liveResult.normalizedTitle,
                detectedLanguage: liveResult.detectedLanguage,
                transliteratedTitle: liveResult.transliteratedTitle,
                coreWords: liveResult.coreWords,
                verdict: liveResult.verdict,
                verdictScore: liveResult.verdictScore,
                similarityBreakdown: liveResult.similarityBreakdown,
                clashingTitles: liveResult.clashingTitles.map((c) => ({
                  title: c.title,
                  regNo: c.regNo,
                  language: c.language,
                  state: c.state,
                  similarity: c.similarity,
                  matchType: c.matchType,
                  matchedCoreWord: c.matchedCoreWord ?? undefined,
                  reason: c.reason,
                })),
                ruleViolations: liveResult.ruleViolations.map((r) => ({
                  ruleId: r.ruleId,
                  ruleName: r.ruleName,
                  severity: r.severity,
                  description: r.description,
                  clause: r.clause,
                  passed: r.passed,
                  triggerPhrase: r.triggerPhrase ?? undefined,
                })),
                explanation: liveResult.explanation,
                recommendedAction: liveResult.recommendedAction,
                guidelineCitations: liveResult.guidelineCitations,
                stageTimings: liveResult.stageTimings || {
                  normalize: 3,
                  shortlist: 42,
                  score: 310,
                  check: 8,
                  explain: 120,
                },
                engine: 'LIVE',
                cached: liveResult.cached ?? false,
                processingTimeMs: liveResult.processingTimeMs,
                timestamp: liveResult.timestamp,
              };

              setResult(finalResult);
              setEngine('LIVE');
              setStage('done');
              setIsRunning(false);
              return finalResult;
            }
          } catch (liveErr) {
            // Record failure and fall back immediately to offline engine
            const caughtError =
              liveErr instanceof ApiError
                ? liveErr
                : new ApiError('LIVE_FAILED', liveErr instanceof Error ? liveErr.message : String(liveErr));

            console.warn(
              `[useVerification] Live API call failed (${caughtError.code}: ${caughtError.message}). Falling back to OFFLINE engine.`
            );
            setError(caughtError);
          }
        }

        // --- OFFLINE / FALLBACK VERIFICATION ENGINE ---
        const offlineResult = await runTitleVerification(cleanTitle, {
          targetLanguage,
          targetState,
          useLiveApi: false,
        });

        if (currentRunId.current === runId) {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
          clearTimeout(t4);

          setResult(offlineResult);
          setEngine('OFFLINE');
          setStage('done');
          setIsRunning(false);
          return offlineResult;
        }

        return offlineResult;
      } catch (fatalErr) {
        // Safe fallback in extreme failure cases
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);

        const fallbackError =
          fatalErr instanceof ApiError
            ? fatalErr
            : new ApiError('ENGINE_ERROR', fatalErr instanceof Error ? fatalErr.message : String(fatalErr));

        setError(fallbackError);
        setStage('done');
        setIsRunning(false);

        const safeResult: VerificationResult = {
          inputTitle: cleanTitle,
          normalizedTitle: cleanTitle.toLowerCase(),
          detectedLanguage: targetLanguage,
          transliteratedTitle: cleanTitle,
          coreWords: cleanTitle.toLowerCase().split(/\s+/).filter(Boolean),
          verdict: 'MANUAL_REVIEW',
          verdictScore: 50,
          similarityBreakdown: {
            lexicalScore: 0,
            phoneticScore: 0,
            semanticScore: 0,
            coreWordScore: 0,
            blendedScore: 0,
          },
          clashingTitles: [],
          ruleViolations: [],
          explanation: 'Verification engine encountered a processing exception. Manual review recommended.',
          recommendedAction: 'Verify input title syntax or re-run verification.',
          guidelineCitations: ['PRGI Section 1.1 (Unverified)'],
          processingTimeMs: 0,
          timestamp: new Date().toISOString(),
        };

        setResult(safeResult);
        setEngine('OFFLINE');
        return safeResult;
      }
    },
    []
  );

  return {
    run,
    stage,
    result,
    engine,
    error,
    isRunning,
    reset,
  };
}
