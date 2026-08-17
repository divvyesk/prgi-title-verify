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
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Hero3DCanvas } from '../canvas/Hero3DCanvas';
import { useVerification } from '../../hooks/useVerification';
import { PipelineProgress } from './PipelineProgress';
import { detectScriptAndLanguage, transliterateToRoman } from '../../utils/transliteration';
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

  // Single unified verification hook
  const { run, stage, result, engine, isRunning } = useVerification(INITIAL_DEMO_RESULT);

  const detected = detectScriptAndLanguage(inputTitle);
  const transliteratedPreview = transliterateToRoman(inputTitle);

  const handleVerify = async (titleToVerify?: string) => {
    const target = (titleToVerify || inputTitle).trim();
    if (!target) return;

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

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-6 sm:px-12 py-8">
      {/* Hero Section with Distinctive Editorial Typography */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        {/* Left Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <h1 className="font-editorial text-4xl sm:text-6xl text-[#1C1917] tracking-tight leading-[1.08]">
              Automated press title clearance in <em className="italic font-normal">sub-2 seconds.</em>
            </h1>
            <p className="text-[#57534E] text-base sm:text-lg leading-relaxed max-w-lg">
              Statutory 4-dimensional NLP verification across 82,713 registered publications before press registration with PRGI.
            </p>
          </div>

          {/* Clean Functional Search Input (Primary Essential Container) */}
          <div className="space-y-3 pt-2">
            <div className="relative flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  placeholder="Enter publication title..."
                  className="w-full bg-white border border-[#DDD6CE] rounded-xl px-4 py-3.5 text-[#1C1917] placeholder-[#A8A29E] text-base font-semibold focus:outline-none shadow-2xs"
                />
                {inputTitle && (
                  <button
                    onClick={() => setInputTitle('')}
                    className="absolute right-4 top-3.5 text-[#78716C] hover:text-[#1C1917] text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                onClick={() => handleVerify()}
                disabled={isRunning || !inputTitle.trim()}
                className="px-8 py-3.5 rounded-xl font-bold text-sm bg-[#1C1917] hover:bg-[#382E22] disabled:opacity-50 text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
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

            {/* Language & State Selectors + Presets */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#57534E] pt-1">
              <div className="flex items-center gap-4">
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

              {/* Preset Links */}
              <div className="flex items-center gap-2">
                <span className="text-[#78716C]">Try:</span>
                {PRESET_TEST_CASES.slice(0, 3).map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      setInputTitle(preset.value);
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

        {/* Right 3D Spatial Canvas */}
        <div className="lg:col-span-6 h-[320px] sm:h-[380px] relative overflow-hidden flex items-center justify-center">
          <Hero3DCanvas title={inputTitle} verdict={result?.verdict} isScanning={isRunning} />
        </div>
      </div>

      {/* Real 5-Stage Pipeline Telemetry Stream (No Boxy Card Wrappers) */}
      <div className="pt-4 border-t border-[#EDE8DF]">
        <PipelineProgress
          stage={stage}
          isRunning={isRunning}
          stageTimings={result?.stageTimings}
          totalTimeMs={result?.processingTimeMs}
          engine={engine}
        />
      </div>

      {/* Verification Results Display */}
      {result && (
        <div className="space-y-10 pt-4">
          {/* Main Verdict Banner */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#DDD6CE] space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
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

                <h2 className="font-editorial text-3xl sm:text-4xl text-[#1C1917]">
                  "{result.inputTitle}"
                </h2>
                <p className="text-sm text-[#57534E] max-w-2xl leading-relaxed">
                  {result.explanation}
                </p>
              </div>

              {/* Conflict Risk Score */}
              <div className="text-right shrink-0">
                <div className="text-xs font-mono text-[#78716C] uppercase">
                  Conflict Risk
                </div>
                <div className={`text-4xl sm:text-5xl font-extrabold font-mono ${
                  result.verdict === 'APPROVED' ? 'text-[#137333]' :
                  result.verdict === 'REJECTED' ? 'text-[#C5221F]' : 'text-[#B06000]'
                }`}>
                  {result.verdictScore}<span className="text-sm font-normal text-[#A8A29E]">/100</span>
                </div>
              </div>
            </div>

            {/* Actions Ribbon */}
            <div className="pt-4 border-t border-[#EDE8DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#57534E]">
              <div>
                <strong className="text-[#1C1917]">Guidance:</strong> {result.recommendedAction}
              </div>

              <div className="flex items-center gap-3">
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
                    className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#382E22] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Generate Alternatives</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4-Dimensional Similarity Analysis & Conflicts (Separated by Spacing, Not Nested Boxes) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: 4-D Similarity Meters */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#1C1917]">
                  4-Dimensional Similarity Breakdown
                </h3>
                <p className="text-xs text-[#78716C]">
                  Weighted scoring against top matching candidate.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
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
                  <div className="flex justify-between text-xs mb-1">
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
                  <div className="flex justify-between text-xs mb-1">
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
                  <div className="flex justify-between text-xs mb-1">
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

              {/* Core Root Tokens */}
              <div className="pt-2 text-xs flex items-center gap-2 flex-wrap">
                <span className="text-[#78716C]">Root Tokens:</span>
                {result.coreWords.map((word, idx) => (
                  <span key={idx} className="font-mono font-bold px-2 py-0.5 bg-[#EAE6DF] text-[#1C1917] rounded text-xs">
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Registry Conflicts List */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[#1C1917]">
                  Top Registry Conflicts ({result.clashingTitles.length})
                </h3>
                <p className="text-xs text-[#78716C]">
                  Most similar titles retrieved from the 82k registry.
                </p>
              </div>

              {result.clashingTitles.length === 0 ? (
                <div className="py-6 text-center text-[#78716C] text-sm">
                  No conflicting titles found in the registry.
                </div>
              ) : (
                <div className="divide-y divide-[#EDE8DF]">
                  {result.clashingTitles.map((clash, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm text-[#1C1917]">
                            {clash.title}
                          </span>
                          <span className="text-xs font-mono text-[#78716C]">
                            {clash.regNo || clash.registration_number || 'REG-MASTER'}
                          </span>
                        </div>
                        <p className="text-xs text-[#57534E]">
                          {clash.language} · {clash.state} — {clash.reason}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-sm text-[#C5221F]">
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

          {/* Statutory PRGI Rule Checks Section (Clean 2-Column Spacing) */}
          <div className="space-y-4 pt-4 border-t border-[#EDE8DF]">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#1C1917]">
                Statutory PRGI Guidelines Compliance Checklist
              </h3>
              <p className="text-xs text-[#78716C]">
                Deterministic admissibility checks evaluated against official guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.ruleViolations.map((rule) => (
                <div
                  key={rule.ruleId}
                  className="py-2.5 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
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
        </div>
      )}
    </div>
  );
};
