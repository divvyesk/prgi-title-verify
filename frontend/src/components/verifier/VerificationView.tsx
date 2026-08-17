import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  FileText, 
  ShieldAlert, 
  MapPin, 
  Globe, 
  Copy, 
  Check, 
  ArrowRight,
  RefreshCw,
  Play
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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-8 py-6">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[380px]">
        {/* Left Headline & Action Column */}
        <div className="lg:col-span-6 space-y-5">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1C1917] tracking-tight leading-[1.15]">
              Verify Press Titles Against <br />
              <span className="text-amber-800">82,713 Registered Records</span>
            </h1>
            <p className="text-sm font-semibold text-[#78716C] tracking-wide">
              Statutory 4-Dimensional NLP Clearance · Sub-2-Second Verification
            </p>
          </div>

          <p className="text-[#44403C] text-sm sm:text-base leading-relaxed max-w-lg">
            Instant admissibility screening checking spelling, phonetics, multilingual translation, and PRGI regulatory guidelines before press registration.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              onClick={() => handleVerify()}
              disabled={isRunning || !inputTitle.trim()}
              className="px-7 py-3 rounded-xl font-bold text-sm bg-[#1C1917] hover:bg-[#382E22] text-white shadow-xs flex items-center gap-2 transition-all cursor-pointer"
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

            <button
              onClick={() => {
                const randomPreset = PRESET_TEST_CASES[Math.floor(Math.random() * PRESET_TEST_CASES.length)];
                setInputTitle(randomPreset.value);
                handleVerify(randomPreset.value);
              }}
              className="flex items-center gap-2 text-xs font-bold text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg border border-[#DDD1BF] bg-white flex items-center justify-center group-hover:border-amber-700 shadow-2xs transition-all">
                <Play className="w-3 h-3 fill-[#1C1917] text-[#1C1917] translate-x-0.5" />
              </div>
              <span>Load Preset Sample</span>
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {PRESET_TEST_CASES.map((preset) => {
              const isCurrent = inputTitle.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  onClick={() => {
                    setInputTitle(preset.value);
                    sound.playClick();
                    handleVerify(preset.value);
                  }}
                  className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#1C1917] text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-[#FAF9F6] text-[#57534E] hover:text-[#1C1917] border border-[#E7E5E4]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 3D Spatial Canvas */}
        <div className="lg:col-span-6 h-[340px] sm:h-[400px] relative rounded-2xl bg-white border border-[#E7E5E4] p-2 overflow-hidden shadow-xs flex items-center justify-center">
          <Hero3DCanvas title={inputTitle} verdict={result?.verdict} isScanning={isRunning} />
        </div>
      </div>

      {/* Main Verification Input Console Card */}
      <div className="beige-card rounded-2xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-[#1C1917]">
            <Search className="w-4 h-4 text-amber-700" />
            <span>Title Search &amp; Parameters</span>
          </div>

          {/* Clean Dropdown Filters */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
              <Globe className="w-3.5 h-3.5 text-amber-700" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-white border border-[#D6D3D1] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1917] font-semibold focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Marathi">Marathi (मराठी)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="Urdu">Urdu (اردو)</option>
                <option value="Bilingual">Bilingual</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-white border border-[#D6D3D1] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1917] font-semibold focus:outline-none"
              >
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Gujarat">Gujarat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="space-y-2">
          <div className="relative flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="Enter proposed publication title (e.g. 'Times India' or 'दैनिक भारत')..."
                className="w-full bg-white border border-[#D6D3D1] rounded-xl px-4 py-3 text-[#1C1917] placeholder-[#A8A29E] text-base font-semibold focus:outline-none shadow-2xs"
              />
              {inputTitle && (
                <button
                  onClick={() => setInputTitle('')}
                  className="absolute right-4 top-3 text-[#78716C] hover:text-[#1C1917] text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={() => handleVerify()}
              disabled={isRunning || !inputTitle.trim()}
              className="px-7 py-3 rounded-xl font-bold text-sm bg-[#1C1917] hover:bg-[#382E22] disabled:opacity-50 text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Verify Title</span>
                </>
              )}
            </button>
          </div>

          {/* Transliteration Live Preview */}
          {detected.isIndic && (
            <div className="py-1 px-3 text-xs flex items-center gap-2 text-[#57534E]">
              <span className="font-semibold text-amber-900">{detected.language}:</span>
              <code className="text-[#1C1917] font-mono bg-[#F5F2EA] px-2 py-0.5 rounded text-xs border border-[#E7E5E4]">
                {transliteratedPreview}
              </code>
            </div>
          )}
        </div>

        {/* Real 5-Stage Pipeline Progress & Measured Latencies */}
        <div className="pt-3 border-t border-[#E7E5E4]">
          <PipelineProgress
            stage={stage}
            isRunning={isRunning}
            stageTimings={result?.stageTimings}
            totalTimeMs={result?.processingTimeMs}
            engine={engine}
          />
        </div>
      </div>

      {/* Verification Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Main Verdict Card */}
          <div className={`p-6 sm:p-7 rounded-2xl ${
            result.verdict === 'APPROVED' ? 'beige-card-success' :
            result.verdict === 'REJECTED' ? 'beige-card-danger' : 'beige-card-warning'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl text-white shadow-xs shrink-0 ${
                  result.verdict === 'APPROVED' ? 'bg-emerald-700' :
                  result.verdict === 'REJECTED' ? 'bg-rose-700' : 'bg-amber-600'
                }`}>
                  {result.verdict === 'APPROVED' && <CheckCircle2 className="w-7 h-7" />}
                  {result.verdict === 'REJECTED' && <XCircle className="w-7 h-7" />}
                  {result.verdict === 'MANUAL_REVIEW' && <AlertTriangle className="w-7 h-7" />}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded tracking-wide ${
                      result.verdict === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                      result.verdict === 'REJECTED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                      'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {result.verdict === 'APPROVED' && 'Approved · Clear for Registration'}
                      {result.verdict === 'REJECTED' && 'Rejected · Conflict Detected'}
                      {result.verdict === 'MANUAL_REVIEW' && 'Manual Review Required'}
                    </span>

                    {/* Visible Engine Chip */}
                    {engine === 'LIVE' ? (
                      <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        LIVE ENGINE · full 82,713-title registry
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-[#F5F2EA] text-[#57534E] border border-[#E7E5E4] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        OFFLINE ENGINE · 2,500-title sample
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] mt-2">
                    "{result.inputTitle}"
                  </h3>
                  <p className="text-xs sm:text-sm text-[#44403C] mt-1 max-w-xl leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              </div>

              {/* Conflict Risk Score Gauge */}
              <div className="flex flex-col items-center justify-center bg-[#FAF9F6] px-6 py-4 rounded-xl border border-[#E7E5E4] min-w-[140px] shadow-2xs self-start md:self-center">
                <div className="text-xs font-mono font-bold text-[#78716C] uppercase tracking-wider">
                  Conflict Risk
                </div>
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono ${
                  result.verdict === 'APPROVED' ? 'text-emerald-700' :
                  result.verdict === 'REJECTED' ? 'text-rose-700' : 'text-amber-700'
                }`}>
                  {result.verdictScore}<span className="text-xs text-[#A8A29E]">/100</span>
                </div>
              </div>
            </div>

            {/* Actions Ribbon */}
            <div className="mt-5 pt-3.5 border-t border-[#E7E5E4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="text-[#57534E]">
                <strong className="text-[#1C1917]">Recommended Action:</strong> {result.recommendedAction}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyVerificationReport}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FAF9F6] text-[#44403C] border border-[#D6D3D1] flex items-center gap-1.5 transition-colors cursor-pointer font-bold"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? 'Copied' : 'Copy Report'}</span>
                </button>

                {result.verdict === 'REJECTED' && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onNavigateToAgents(result.inputTitle);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#1C1917] hover:bg-[#382E22] text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Generate Safe Alternatives</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4-Dimensional Similarity Matrix & Clashing Records */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 4-D Similarity Breakdown */}
            <div className="lg:col-span-5 beige-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
                <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                  <span>4-Dimensional Similarity</span>
                </div>
                <span className="text-xs text-[#78716C] font-mono">NLP Engine</span>
              </div>

              <div className="space-y-3.5">
                {/* 1. Lexical */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-semibold">Lexical Permutation</span>
                    <span className="font-mono font-bold text-amber-900">{result.similarityBreakdown.lexicalScore}%</span>
                  </div>
                  <div className="w-full bg-[#EAE6DF] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.lexicalScore}%` }}
                    />
                  </div>
                </div>

                {/* 2. Phonetic */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-semibold">Phonetic Soundex</span>
                    <span className="font-mono font-bold text-amber-900">{result.similarityBreakdown.phoneticScore}%</span>
                  </div>
                  <div className="w-full bg-[#EAE6DF] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-800 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.phoneticScore}%` }}
                    />
                  </div>
                </div>

                {/* 3. Semantic */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-semibold">Semantic Multilingual</span>
                    <span className="font-mono font-bold text-emerald-900">{result.similarityBreakdown.semanticScore}%</span>
                  </div>
                  <div className="w-full bg-[#EAE6DF] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.semanticScore}%` }}
                    />
                  </div>
                </div>

                {/* 4. Core-Word */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-semibold">Core Root Token</span>
                    <span className="font-mono font-bold text-stone-900">{result.similarityBreakdown.coreWordScore}%</span>
                  </div>
                  <div className="w-full bg-[#EAE6DF] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-stone-800 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.coreWordScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Extracted Core Root Tokens */}
              <div className="pt-2 border-t border-[#E7E5E4] text-xs flex items-center gap-2 flex-wrap">
                <span className="text-[#78716C] font-semibold">Root Tokens:</span>
                {result.coreWords.map((word, idx) => (
                  <span key={idx} className="font-mono font-bold px-2 py-0.5 rounded bg-[#F5F2EA] text-[#1C1917] border border-[#E7E5E4] text-xs">
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Clashing Titles Table */}
            <div className="lg:col-span-7 beige-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
                <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-700" />
                  <span>Top Registry Conflicts ({result.clashingTitles.length})</span>
                </div>
                <span className="text-xs text-[#78716C] font-mono">82k Registry</span>
              </div>

              {result.clashingTitles.length === 0 ? (
                <div className="p-8 text-center text-[#78716C] space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-700 mx-auto" />
                  <p className="font-bold text-[#1C1917] text-sm">No Registered Conflicts</p>
                  <p className="text-xs text-[#78716C]">Title is distinct and conflict-free.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {result.clashingTitles.map((clash, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-[#E7E5E4] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1C1917] text-sm">
                            {clash.title}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-[#F5F2EA] text-[#57534E] font-mono">
                            {clash.regNo || clash.registration_number || 'REG-MASTER'}
                          </span>
                        </div>
                        <p className="text-xs text-[#78716C] mt-0.5">
                          {clash.language} · {clash.state} — <span className="text-[#44403C]">{clash.reason}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold font-mono text-rose-700">
                          {clash.similarity}%
                        </div>
                        <div className="text-[11px] uppercase font-bold text-[#78716C]">
                          {clash.matchType}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Statutory PRGI Rule Checks Card */}
          <div className="beige-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
              <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Statutory PRGI Guidelines Compliance Checklist</span>
              </div>
              <span className="text-xs text-[#78716C] font-mono">PRGI Rules 2023</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.ruleViolations.map((rule) => (
                <div
                  key={rule.ruleId}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                    rule.passed
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : rule.severity === 'CRITICAL'
                      ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                      : 'bg-amber-50/50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">
                        {rule.ruleName}
                      </span>
                      <span className="text-[11px] font-mono font-semibold opacity-75">
                        ({rule.clause})
                      </span>
                    </div>
                    <p className="text-xs opacity-90 leading-relaxed">
                      {rule.description}
                    </p>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {rule.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-700" />
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
