import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Globe, 
  Copy, 
  Check, 
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  FileQuestion,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Hero3DCanvas } from '../canvas/Hero3DCanvas';
import { useVerification } from '../../hooks/useVerification';
import { PipelineProgress } from './PipelineProgress';
import { ScrollReveal } from '../common/ScrollReveal';
import { detectScriptAndLanguage, transliterateToRoman } from '../../utils/transliteration';
import { ApiError } from '../../api/client';
import type { VerificationResult } from '../../types';
import { sound } from '../../utils/audio';

interface VerificationViewProps {
  onNavigateToAgents: (seedTitle?: string) => void;
  useLiveApi: boolean;
  initialTitle?: string;
}

const PRESET_TEST_CASES = [
  { label: 'Times India', value: 'Times India' },
  { label: 'Jaagran Weekly', value: 'Jaagran Weekly' },
  { label: 'Dainik Samachar', value: 'Dainik Samachar' },
  { label: 'The Vidarbha Daily', value: 'The Vidarbha Daily Express' },
  { label: 'Aditi National Strategy', value: 'Aditi National Strategy Review' }
];

const INITIAL_DEMO_RESULT: VerificationResult = {
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
  clashingTitles: [
    {
      title: 'India Times',
      regNo: 'DELENG/2012/48192',
      language: 'English',
      state: 'Delhi',
      similarity: 92,
      matchType: 'LEXICAL',
      reason: 'Anagrammatic word order permutation'
    }
  ],
  ruleViolations: [
    {
      ruleId: 'R-GEN-01',
      ruleName: 'Single Generic Word Protection',
      passed: true,
      clause: 'PRGI Section 1.1',
      description: 'Multi-token publication title.',
      severity: 'INFO'
    },
    {
      ruleId: 'R-DEC-02',
      ruleName: 'Deceptive Similarity Protection',
      passed: false,
      clause: 'PRGI Section 2.3',
      description: 'Permutation conflict with registered title "India Times".',
      severity: 'CRITICAL'
    }
  ],
  explanation: 'Proposed title conflicts with registered publication "India Times" under PRGI Anagram & Deceptive Similarity Protection.',
  recommendedAction: 'Use the AI Studio to generate distinctive, pre-cleared alternatives.',
  guidelineCitations: ['PRGI Title Verification Guidelines 2025, Section 2.3'],
  stageTimings: {
    normalize: 3,
    shortlist: 42,
    score: 310,
    check: 8,
    explain: 120
  },
  engine: 'OFFLINE',
  cached: false,
  processingTimeMs: 483,
  timestamp: new Date().toISOString()
};

export const VerificationView: React.FC<VerificationViewProps> = ({
  onNavigateToAgents,
  useLiveApi,
  initialTitle = 'Times India'
}) => {
  const [inputTitle, setInputTitle] = useState(initialTitle);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [copiedReport, setCopiedReport] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Single unified verification hook
  const { run, stage, result, engine, error, isRunning } = useVerification(INITIAL_DEMO_RESULT);

  const detected = detectScriptAndLanguage(inputTitle);
  const transliteratedPreview = transliterateToRoman(inputTitle);

  const handleVerify = async (titleToVerify?: string) => {
    const rawTarget = titleToVerify !== undefined ? titleToVerify : inputTitle;
    const target = rawTarget.trim();

    // Inline empty title validation (Requirement: "Enter a title to verify." — inline, next to the field, not a toast)
    if (!target) {
      setInlineError('Enter a title to verify.');
      sound.playAlert();
      return;
    }

    setInlineError(null);
    sound.playScan();

    try {
      const res = await run(target, {
        language: selectedLanguage,
        state: selectedState,
        useLiveApi
      });

      if (res.verdict === 'APPROVED') {
        sound.playSuccess();
        confetti({
          particleCount: 60,
          spread: 55,
          origin: { y: 0.6 },
          colors: ['#059669', '#D97706', '#B45309']
        });
      } else if (res.verdict === 'REJECTED') {
        sound.playAlert();
      } else {
        sound.playClick();
      }
    } catch (err) {
      console.error('Verification error:', err);
    }
  };

  useEffect(() => {
    if (initialTitle && initialTitle !== inputTitle) {
      setInputTitle(initialTitle);
      handleVerify(initialTitle);
    }
  }, [initialTitle]);

  const copyVerificationReport = () => {
    if (!result) return;
    sound.playClick();
    const text = `--- PRGI Title Verification Report ---
Title: ${result.inputTitle}
Engine: ${engine === 'LIVE' ? 'LIVE (Full 82,713-Title Registry)' : 'OFFLINE (Sample 2,500-Title Registry)'}
Verdict: ${result.verdict} (Risk: ${result.verdictScore}/100)
Language: ${result.detectedLanguage} | State: ${selectedState}
4D Similarity: Lexical ${result.similarityBreakdown.lexicalScore}%, Phonetic ${result.similarityBreakdown.phoneticScore}%, Semantic ${result.similarityBreakdown.semanticScore}%, Core-Word ${result.similarityBreakdown.coreWordScore}%
Explanation: ${result.explanation}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Honest specific error copy formatting
  const getSpecificErrorNotice = () => {
    if (!error) return null;

    if (error instanceof ApiError) {
      if (error.code === 'TIMEOUT' || error.code === 'REQUEST_TIMEOUT') {
        return {
          message: 'The live engine took longer than 2.5 seconds. Showing the offline result.',
          type: 'timeout'
        };
      }
      if (error.code === 'VALIDATION_FAILED' || error.code === 'VALIDATION_ERROR' || error.code === 'INVALID_RESPONSE') {
        console.error('[VerificationView] Validation failure details:', error.rawDetails || error.message);
        return {
          message: 'The server returned an unexpected response. Showing the offline result.',
          type: 'validation'
        };
      }
    }

    const lowerMsg = (error.message || '').toLowerCase();
    if (lowerMsg.includes('fetch') || lowerMsg.includes('failed to fetch') || lowerMsg.includes('network') || lowerMsg.includes('refused') || lowerMsg.includes('unreachable')) {
      return {
        message: 'Live engine unreachable — showing an offline result from the 2,500-title sample.',
        type: 'unreachable'
      };
    }

    if (lowerMsg.includes('timeout') || lowerMsg.includes('abort')) {
      return {
        message: 'The live engine took longer than 2.5 seconds. Showing the offline result.',
        type: 'timeout'
      };
    }

    if (lowerMsg.includes('validation') || lowerMsg.includes('unexpected') || lowerMsg.includes('json')) {
      console.error('[VerificationView] Server response parsing error:', error);
      return {
        message: 'The server returned an unexpected response. Showing the offline result.',
        type: 'validation'
      };
    }

    return {
      message: 'Live engine unreachable — showing an offline result from the 2,500-title sample.',
      type: 'generic'
    };
  };

  const errorNotice = getSpecificErrorNotice();

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-12 divide-y divide-[#EAE4DA]">
      
      {/* CHAPTER 01: Hero & Verification Entry Viewport */}
      <section className="py-12 sm:py-20">
        <ScrollReveal direction="up" delayMs={50}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Editorial Headline & Search Interface */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
                  01 / Statutory Press Clearance
                </div>
                <h1 className="font-editorial text-5xl sm:text-7xl text-[#1C1917] tracking-tight leading-[1.04]">
                  Automated title verification in <em className="italic font-normal">sub-2 seconds.</em>
                </h1>
                <p className="text-[#57534E] text-base sm:text-lg leading-relaxed max-w-lg font-normal">
                  Statutory 4-dimensional NLP conflict detection across 82,713 registered titles before press registration with PRGI.
                </p>
              </div>

              {/* Clean Functional Search Input */}
              <div className="space-y-3 pt-2">
                <div className="relative flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputTitle}
                      onChange={(e) => {
                        setInputTitle(e.target.value);
                        if (inlineError) setInlineError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                      placeholder="Enter publication title..."
                      className={`w-full bg-white border ${
                        inlineError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#DDD5C9]'
                      } rounded-xl px-5 py-4 text-[#1C1917] placeholder-[#A8A29E] text-base font-semibold focus:outline-none shadow-2xs`}
                    />
                    {inputTitle && (
                      <button
                        onClick={() => {
                          setInputTitle('');
                          setInlineError(null);
                        }}
                        className="absolute right-4 top-4 text-[#78716C] hover:text-[#1C1917] text-xs font-bold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleVerify()}
                    disabled={isRunning}
                    className="px-8 py-4 rounded-xl font-bold text-sm bg-[#1C1917] hover:bg-[#382E22] disabled:opacity-50 text-white shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Title</span>
                        <ArrowRight className="w-4 h-4 text-amber-300" />
                      </>
                    )}
                  </button>
                </div>

                {/* Inline Validation Error Requirement */}
                {inlineError && (
                  <div className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 pt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{inlineError}</span>
                  </div>
                )}

                {/* Filter Controls & Presets */}
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#57534E] pt-1">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#78716C]" />
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="bg-transparent font-semibold text-[#1C1917] focus:outline-none cursor-pointer"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Gujarati">Gujarati</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#78716C]" />
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="bg-transparent font-semibold text-[#1C1917] focus:outline-none cursor-pointer"
                      >
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                      </select>
                    </div>
                  </div>

                  {/* Sample Preset Links */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#78716C]">Try:</span>
                    {PRESET_TEST_CASES.slice(0, 3).map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setInputTitle(preset.value);
                          setInlineError(null);
                          sound.playClick();
                          handleVerify(preset.value);
                        }}
                        className="hover:text-[#1C1917] hover:underline font-medium cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transliteration Preview */}
                {detected.isIndic && (
                  <div className="text-xs text-[#57534E] flex items-center gap-2 pt-1">
                    <span>{detected.language}:</span>
                    <code className="font-mono bg-[#EFEAE1] px-2 py-0.5 rounded text-xs text-[#1C1917]">
                      {transliteratedPreview}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: 3D Spatial Canvas */}
            <div className="lg:col-span-6 h-[340px] sm:h-[420px] relative overflow-hidden flex items-center justify-center">
              <Hero3DCanvas title={inputTitle} verdict={result?.verdict} isScanning={isRunning} />
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* CHAPTER 02: Real 5-Stage Pipeline Telemetry Stream */}
      <section className="py-12 sm:py-16">
        <ScrollReveal direction="up" delayMs={100}>
          <div className="space-y-2 mb-6">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
              02 / Live Processing Telemetry
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl text-[#1C1917]">
              Multi-dimensional clearance pipeline
            </h2>
          </div>

          <PipelineProgress
            stage={stage}
            isRunning={isRunning}
            stageTimings={result?.stageTimings}
            totalTimeMs={result?.processingTimeMs}
            engine={engine}
          />
        </ScrollReveal>
      </section>

      {/* Specific Honest Error Banner (When Live Engine Fails / Times out / Schema fails) */}
      {errorNotice && (
        <section className="py-4">
          <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="font-medium">{errorNotice.message}</span>
            </div>
            <button
              onClick={() => handleVerify()}
              className="px-3.5 py-1.5 bg-amber-900 hover:bg-amber-950 text-white rounded-lg font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>Retry</span>
            </button>
          </div>
        </section>
      )}

      {/* Loading Skeleton State */}
      {isRunning && !result && (
        <section className="py-12 sm:py-20 space-y-6">
          <div className="p-8 sm:p-10 rounded-2xl bg-white border border-[#DDD5C9] space-y-4 animate-pulse">
            <div className="h-6 bg-[#EAE4DA] rounded w-1/4" />
            <div className="h-10 bg-[#EAE4DA] rounded w-2/3" />
            <div className="h-4 bg-[#EAE4DA] rounded w-1/2" />
          </div>
        </section>
      )}

      {/* Empty State */}
      {!isRunning && !result && (
        <section className="py-16 text-center space-y-3">
          <FileQuestion className="w-8 h-8 text-[#A8A29E] mx-auto" />
          <h3 className="font-bold text-base text-[#1C1917]">No Title Verified Yet</h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            Enter a publication title above and click "Verify Title" to run statutory admissibility clearance.
          </p>
        </section>
      )}

      {/* CHAPTER 03: Success State — Primary Verdict Banner & Statutory Evidence */}
      {result && (
        <section className="py-12 sm:py-20 space-y-16">
          {/* Main Verdict Banner */}
          <ScrollReveal direction="up" delayMs={50}>
            <div className="space-y-3 mb-6">
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
                03 / Admissibility Outcome
              </div>
            </div>

            <div className={`p-8 sm:p-10 rounded-2xl ${
              result.verdict === 'APPROVED' ? 'beige-card-success' :
              result.verdict === 'REJECTED' ? 'beige-card-danger' : 'beige-card-warning'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded tracking-wide ${
                      result.verdict === 'APPROVED' ? 'bg-[#E6F4EA] text-[#137333]' :
                      result.verdict === 'REJECTED' ? 'bg-[#FCE8E6] text-[#C5221F]' :
                      'bg-[#FEF7E0] text-[#B06000]'
                    }`}>
                      {result.verdict === 'APPROVED' && 'Approved · Clear for Registration'}
                      {result.verdict === 'REJECTED' && 'Rejected · Conflict Detected'}
                      {result.verdict === 'MANUAL_REVIEW' && 'Manual Review Required'}
                    </span>

                    {engine === 'LIVE' ? (
                      <span className="text-xs font-mono text-[#137333] font-semibold">
                        Live Engine (82,713 Registry)
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-[#78716C]">
                        Offline Engine (2,500 Sample)
                      </span>
                    )}
                  </div>

                  <h2 className="font-editorial text-4xl sm:text-5xl text-[#1C1917] tracking-tight">
                    "{result.inputTitle}"
                  </h2>
                  <p className="text-sm sm:text-base text-[#57534E] max-w-2xl leading-relaxed">
                    {result.explanation}
                  </p>
                </div>

                {/* Conflict Risk Score */}
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-[#78716C] uppercase">
                    Conflict Risk
                  </div>
                  <div className={`text-5xl sm:text-6xl font-extrabold font-mono ${
                    result.verdict === 'APPROVED' ? 'text-[#137333]' :
                    result.verdict === 'REJECTED' ? 'text-[#C5221F]' : 'text-[#B06000]'
                  }`}>
                    {result.verdictScore}<span className="text-sm font-normal text-[#A8A29E]">/100</span>
                  </div>
                </div>
              </div>

              {/* Actions Ribbon */}
              <div className="mt-8 pt-4 border-t border-[#EDE8DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#57534E]">
                <div>
                  <strong className="text-[#1C1917]">Guidance:</strong> {result.recommendedAction}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={copyVerificationReport}
                    className="hover:text-[#1C1917] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5 text-[#137333]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReport ? 'Report Copied' : 'Copy Report'}</span>
                  </button>

                  {result.verdict === 'REJECTED' && (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onNavigateToAgents(result.inputTitle);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#382E22] text-white font-bold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Generate Alternatives</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* CHAPTER 04: 4-D Similarity Analysis & Conflicts */}
          <ScrollReveal direction="up" delayMs={100}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              {/* Left Column: 4-D Similarity Breakdown */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
                    04 / 4-Dimensional NLP Scoring
                  </div>
                  <h3 className="font-editorial text-2xl sm:text-3xl text-[#1C1917]">
                    Similarity Dimensions
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Weighted similarity against highest matching registered title.
                  </p>
                </div>

                <div className="space-y-5 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#44403C] font-semibold">Lexical Permutation</span>
                      <span className="font-mono font-bold text-[#1C1917]">{result.similarityBreakdown.lexicalScore}%</span>
                    </div>
                    <div className="w-full bg-[#EAE6DF] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1C1917] h-full rounded-full transition-all duration-500"
                        style={{ width: `${result.similarityBreakdown.lexicalScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#44403C] font-semibold">Phonetic Soundex</span>
                      <span className="font-mono font-bold text-[#1C1917]">{result.similarityBreakdown.phoneticScore}%</span>
                    </div>
                    <div className="w-full bg-[#EAE6DF] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1C1917] h-full rounded-full transition-all duration-500"
                        style={{ width: `${result.similarityBreakdown.phoneticScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#44403C] font-semibold">Semantic Multilingual</span>
                      <span className="font-mono font-bold text-[#137333]">{result.similarityBreakdown.semanticScore}%</span>
                    </div>
                    <div className="w-full bg-[#EAE6DF] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#137333] h-full rounded-full transition-all duration-500"
                        style={{ width: `${result.similarityBreakdown.semanticScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#44403C] font-semibold">Core Root Token</span>
                      <span className="font-mono font-bold text-[#1C1917]">{result.similarityBreakdown.coreWordScore}%</span>
                    </div>
                    <div className="w-full bg-[#EAE6DF] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#1C1917] h-full rounded-full transition-all duration-500"
                        style={{ width: `${result.similarityBreakdown.coreWordScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Extracted Core Root Tokens */}
                <div className="pt-3 text-xs flex items-center gap-2 flex-wrap">
                  <span className="text-[#78716C]">Root Tokens:</span>
                  {result.coreWords.map((word, idx) => (
                    <span key={idx} className="font-mono font-bold px-2 py-0.5 bg-[#EAE6DF] text-[#1C1917] rounded text-xs">
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right Column: Registry Conflict Records */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
                    05 / Registry Collision Analysis
                  </div>
                  <h3 className="font-editorial text-2xl sm:text-3xl text-[#1C1917]">
                    Top Registry Conflicts ({result.clashingTitles.length})
                  </h3>
                  <p className="text-xs text-[#78716C]">
                    Nearest conflicting publications retrieved from the 82,713 title index.
                  </p>
                </div>

                {result.clashingTitles.length === 0 ? (
                  <div className="py-8 text-center text-[#78716C] text-sm">
                    No conflicting registered publications found in the database.
                  </div>
                ) : (
                  <div className="divide-y divide-[#EDE8DF] pt-2">
                    {result.clashingTitles.map((clash, idx) => (
                      <div key={idx} className="py-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-bold text-base text-[#1C1917]">
                              {clash.title}
                            </span>
                            <span className="text-xs font-mono text-[#78716C]">
                              {clash.regNo || clash.registration_number || 'REG-MASTER'}
                            </span>
                          </div>
                          <p className="text-xs text-[#57534E] leading-relaxed">
                            {clash.language} · {clash.state} — {clash.reason}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-base text-[#C5221F]">
                            {clash.similarity}%
                          </span>
                          <div className="text-[10px] font-bold text-[#78716C] uppercase">
                            {clash.matchType}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>

          {/* CHAPTER 05: Statutory PRGI Guidelines Checklist */}
          <ScrollReveal direction="up" delayMs={100}>
            <div className="space-y-6 pt-6 border-t border-[#EDE8DF]">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
                  06 / Statutory Verification Rules
                </div>
                <h3 className="font-editorial text-2xl sm:text-3xl text-[#1C1917]">
                  Statutory PRGI Guidelines Compliance Checklist
                </h3>
                <p className="text-xs text-[#78716C]">
                  Deterministic admissibility checks evaluated against official guidelines.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {result.ruleViolations.map((rule) => (
                  <div
                    key={rule.ruleId}
                    className="py-3 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#1C1917]">
                          {rule.ruleName}
                        </span>
                        <span className="text-[11px] font-mono text-[#78716C]">
                          {rule.clause}
                        </span>
                      </div>
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        {rule.description}
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {rule.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#137333]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#C5221F]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>
      )}
    </div>
  );
};
