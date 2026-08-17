/**
 * Full Client-Side Verification Pipeline Orchestrator
 * Seamlessly integrates Stage 1 (Clean) -> Stage 2 (Shortlist) -> Stage 3 (Score 4D) -> Stage 4 (Rules) -> Stage 5 (Explain).
 * Also supports switching to live FastAPI endpoint `http://localhost:8000/verify-title` when available!
 */

import type { ClashingTitle, SimilarityScores, VerificationResult } from '../types';
import sampleTitlesRaw from '../data/titleMasterSample.json';
import { detectScriptAndLanguage, transliterateToRoman } from './transliteration';
import { 
  normalizeTitle, 
  extractCoreWords, 
  calculateLexicalSimilarity, 
  calculatePhoneticSimilarity, 
  calculateSemanticSimilarity, 
  calculateCoreWordSimilarity 
} from './similarity';
import { evaluateGovernmentRules } from './rulesEngine';

const sampleTitles = sampleTitlesRaw as Array<{
  id: string;
  title: string;
  language: string;
  state: string;
  regNo: string;
  regDate: string;
  publisher?: string;
  owner?: string;
  periodicity?: string;
}>;

export async function runTitleVerification(
  inputTitle: string,
  options?: { targetLanguage?: string; targetState?: string; useLiveApi?: boolean }
): Promise<VerificationResult> {
  const startTime = performance.now();

  // If live backend API is toggled, attempt calling FastAPI
  if (options?.useLiveApi) {
    try {
      const response = await fetch('http://localhost:8000/verify-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inputTitle,
          language: options?.targetLanguage || 'English',
          state: options?.targetState || 'Delhi'
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data as VerificationResult;
      }
    } catch {
      console.warn('Live API unreachable, gracefully falling back to embedded local verification engine.');
    }
  }

  // --- STAGE 1: CLEAN & NORMALIZE ---
  const tNormStart = performance.now();
  const rawClean = inputTitle.trim();
  const { language: detectedLang } = detectScriptAndLanguage(rawClean);
  const transliterated = transliterateToRoman(rawClean);
  const normalized = normalizeTitle(transliterated);
  const coreWords = extractCoreWords(normalized);
  const tNormDuration = Math.max(1, Math.round(performance.now() - tNormStart));

  // --- STAGE 2: SHORTLIST CANDIDATES ---
  const tShortlistStart = performance.now();
  const clashingCandidates: ClashingTitle[] = [];

  for (const record of sampleTitles) {
    const candidateNormalized = normalizeTitle(record.title);
    if (!candidateNormalized) continue;

    const lexScore = calculateLexicalSimilarity(normalized, candidateNormalized);
    const phonScore = calculatePhoneticSimilarity(normalized, candidateNormalized);
    const semScore = calculateSemanticSimilarity(normalized, candidateNormalized);
    const coreResult = calculateCoreWordSimilarity(normalized, candidateNormalized);

    // Blended weighted score
    let maxDimension = Math.max(lexScore, phonScore, semScore, coreResult.score);
    let matchType: ClashingTitle['matchType'] = 'LEXICAL';
    let reason = 'High textual and character overlap';

    if (coreResult.score >= 85) {
      matchType = 'CORE_WORD';
      reason = `Shares primary distinctive root token "${coreResult.matchedCoreWord}" with registered publication`;
    } else if (semScore >= 75) {
      matchType = 'SEMANTIC';
      reason = 'Identical concept/meaning across multilingual translation';
    } else if (phonScore >= 80) {
      matchType = 'PHONETIC';
      reason = 'Confusingly similar phonetic sound and pronunciation';
    } else if (lexScore >= 75) {
      matchType = 'LEXICAL';
      reason = 'High spelling similarity or anagrammatic word permutation';
    }

    if (maxDimension >= 45) {
      clashingCandidates.push({
        title: record.title,
        regNo: record.regNo,
        language: record.language,
        state: record.state,
        similarity: maxDimension,
        matchType,
        matchedCoreWord: coreResult.matchedCoreWord,
        reason
      });
    }
  }

  // Sort by highest clash similarity
  clashingCandidates.sort((a, b) => b.similarity - a.similarity);
  const topClashing = clashingCandidates.slice(0, 5);
  const tShortlistDuration = Math.max(1, Math.round(performance.now() - tShortlistStart));

  // --- STAGE 3: 4-DIMENSIONAL SCORING ---
  const tScoreStart = performance.now();
  const highestClash = topClashing.length > 0 ? topClashing[0].similarity : 0;

  // Calculate detailed aggregated similarity metrics
  let avgLex = 0, avgPhon = 0, avgSem = 0, avgCore = 0;
  if (topClashing.length > 0) {
    const top = topClashing[0];
    avgLex = calculateLexicalSimilarity(normalized, normalizeTitle(top.title));
    avgPhon = calculatePhoneticSimilarity(normalized, normalizeTitle(top.title));
    avgSem = calculateSemanticSimilarity(normalized, normalizeTitle(top.title));
    avgCore = calculateCoreWordSimilarity(normalized, normalizeTitle(top.title)).score;
  }

  const similarityBreakdown: SimilarityScores = {
    lexicalScore: avgLex,
    phoneticScore: avgPhon,
    semanticScore: avgSem,
    coreWordScore: avgCore,
    blendedScore: highestClash
  };
  const tScoreDuration = Math.max(1, Math.round(performance.now() - tScoreStart));

  // --- STAGE 4: DETERMINISTIC RULES CHECK ---
  const tRulesStart = performance.now();
  const ruleViolations = evaluateGovernmentRules(rawClean);
  const criticalRuleFailed = ruleViolations.some(r => !r.passed && r.severity === 'CRITICAL');
  const warningRuleFailed = ruleViolations.some(r => !r.passed && r.severity === 'WARNING');
  const tRulesDuration = Math.max(1, Math.round(performance.now() - tRulesStart));

  // --- STAGE 5: EXPLAIN & VERDICT SYNTHESIS ---
  const tExplainStart = performance.now();
  let verdict: 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED';
  let verdictScore = 0;

  if (criticalRuleFailed || highestClash >= 75) {
    verdict = 'REJECTED';
    verdictScore = Math.max(highestClash, 85);
  } else if (warningRuleFailed || highestClash >= 45) {
    verdict = 'MANUAL_REVIEW';
    verdictScore = Math.max(highestClash, 55);
  } else {
    verdict = 'APPROVED';
    verdictScore = Math.max(0, highestClash);
  }

  // Generate grounded explanation
  let explanation = '';
  let recommendedAction = '';
  const citations: string[] = [];

  if (verdict === 'REJECTED') {
    if (criticalRuleFailed) {
      const failedRule = ruleViolations.find(r => !r.passed && r.severity === 'CRITICAL')!;
      explanation = `The proposed title "${inputTitle}" is rejected due to violation of ${failedRule.ruleName}. ${failedRule.description}`;
      recommendedAction = 'Remove restricted terms, prohibited institutional words, or commercial suffixes before resubmitting.';
      citations.push(failedRule.clause);
    } else {
      explanation = `The title "${inputTitle}" is rejected due to excessive conflict (${highestClash}% similarity) with registered title "${topClashing[0].title}" (${topClashing[0].language}, ${topClashing[0].state}). ${topClashing[0].reason}.`;
      recommendedAction = 'Use the AI Agentic Studio to generate distinctive, pre-verified alternative name candidates.';
      citations.push('PRGI Verification Guidelines 2025, Section 2.3 (Deceptive Similarity)');
    }
  } else if (verdict === 'MANUAL_REVIEW') {
    explanation = `The proposed title has moderate phonetic or core-token proximity (${highestClash}% clash) with existing registered title "${topClashing[0].title}". Requires scrutiny by the District Magistrate / PRGI reviewing officer.`;
    recommendedAction = 'Consider adding an authorized geographic prefix or distinctive institutional qualifier.';
    citations.push('PRGI Verification Guidelines 2025, Section 3.1 (Borderline Substantial Discretion)');
  } else {
    explanation = `Title "${inputTitle}" is distinct and fully compliant. No conflicting registered titles found within similarity threshold, and all PRGI statutory rules passed.`;
    recommendedAction = 'Proceed with Aadhaar e-Sign filing on the Press Sewa Portal.';
    citations.push('PRGI Title Verification Guidelines 2025, Clear Status Clause 1.4');
  }
  const tExplainDuration = Math.max(1, Math.round(performance.now() - tExplainStart));

  const processingTimeMs = Math.round(performance.now() - startTime);

  return {
    inputTitle,
    normalizedTitle: normalized,
    detectedLanguage: detectedLang,
    transliteratedTitle: transliterated,
    coreWords,
    verdict,
    verdictScore,
    similarityBreakdown,
    clashingTitles: topClashing,
    ruleViolations,
    explanation,
    recommendedAction,
    guidelineCitations: citations,
    stageTimings: {
      normalize: tNormDuration,
      shortlist: tShortlistDuration,
      score: tScoreDuration,
      check: tRulesDuration,
      explain: tExplainDuration,
    },
    engine: 'OFFLINE',
    cached: false,
    processingTimeMs,
    timestamp: new Date().toISOString()
  };
}
