import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  FileText, 
  ShieldAlert, 
  Copy, 
  Check, 
  Globe, 
  RefreshCw, 
  TrendingUp, 
  MapPin,
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Hero3DCanvas } from '../canvas/Hero3DCanvas';
import { runTitleVerification } from '../../utils/verificationEngine';
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

const PIPELINE_STAGES = [
  { num: 1, name: 'Normalize' },
  { num: 2, name: 'Shortlist' },
  { num: 3, name: '4-D Score' },
  { num: 4, name: 'Statutory Rules' },
  { num: 5, name: 'Verdict' }
];

export const VerificationView: React.FC<VerificationViewProps> = ({
  onNavigateToAgents,
  useLiveApi,
  initialTitle = 'Times India'
}) => {
  const [inputTitle, setInputTitle] = useState(initialTitle);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(() => {
    try {
      const rawClean = initialTitle.trim();
      return {
        inputTitle: rawClean,
        normalizedTitle: rawClean.toLowerCase(),
        detectedLanguage: 'English',
        transliteratedTitle: rawClean,
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
        processingTimeMs: 42,
        timestamp: new Date().toISOString()
      };
    } catch {
      return null;
    }
  });
  const [activeStage, setActiveStage] = useState(5);
  const [copiedReport, setCopiedReport] = useState(false);

  const detected = detectScriptAndLanguage(inputTitle);
  const transliteratedPreview = transliterateToRoman(inputTitle);

  const handleVerify = async (titleToVerify?: string) => {
    const target = (titleToVerify || inputTitle).trim();
    if (!target) return;

    sound.playScan();
    setIsScanning(true);
    setActiveStage(1);

    setTimeout(() => setActiveStage(2), 70);
    setTimeout(() => setActiveStage(3), 140);
    setTimeout(() => setActiveStage(4), 210);

    setTimeout(async () => {
      try {
        const res = await runTitleVerification(target, {
          targetLanguage: selectedLanguage,
          targetState: selectedState,
          useLiveApi
        });
        setResult(res);
        setIsScanning(false);
        setActiveStage(5);

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
        setIsScanning(false);
        setActiveStage(5);
      }
    }, 280);
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
Verdict: ${result.verdict} (Risk: ${result.verdictScore}/100)
Language: ${result.detectedLanguage} | State: ${selectedState}
4D Similarity: Lexical ${result.similarityBreakdown.lexicalScore}%, Phonetic ${result.similarityBreakdown.phoneticScore}%, Semantic ${result.similarityBreakdown.semanticScore}%, Core-Word ${result.similarityBreakdown.coreWordScore}%
Explanation: ${result.explanation}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
      {/* Hero Section (Clean Poppins Typography + 3D Text & Background Shapes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center min-h-[400px]">
        {/* Left Copy Column */}
        <div className="lg:col-span-6 space-y-5">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl font-poppins font-extrabold text-[#1C1917] tracking-tight leading-[1.15]">
              The new <br />
              <span className="text-amber-800">Title Clearance</span> <br />
              Platform
            </h1>
            <div className="text-xs sm:text-sm font-bold font-poppins text-[#75634B] tracking-[0.22em] uppercase pt-1">
              AUTOMATED STATUTORY VERIFICATION
            </div>
          </div>

          <p className="text-[#564735] text-sm sm:text-base leading-relaxed max-w-lg font-poppins">
            An intelligent AI clearance platform whose multi-dimensional 4-D neural conflict detection protects national press identity and streamlines PRGI approvals.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              onClick={() => handleVerify()}
              disabled={isScanning || !inputTitle.trim()}
              className="px-7 py-3 rounded-full font-bold text-sm bg-[#1C1917] hover:bg-[#382E22] text-white shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify Now</span>
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
              className="flex items-center gap-2 text-sm font-semibold text-[#564735] hover:text-[#1C1917] transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full border border-[#DDD1BF] bg-white flex items-center justify-center group-hover:border-amber-700 shadow-xs transition-all">
                <Play className="w-3 h-3 fill-[#1C1917] text-[#1C1917] translate-x-0.5" />
              </div>
              <span>Preset Scenarios</span>
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
                  className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#1C1917] text-white font-semibold shadow-xs'
                      : 'bg-white/80 hover:bg-white text-[#564735] hover:text-[#1C1917] border border-[#E2D7C5]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 3D Spatial Canvas (Prominent 3D Text + Aesthetic Shapes in Background) */}
        <div className="lg:col-span-6 h-[340px] sm:h-[420px] relative rounded-3xl bg-white/60 border border-[#E2D7C5] p-2 overflow-hidden shadow-xs flex items-center justify-center mouse-spotlight">
          <Hero3DCanvas title={inputTitle} verdict={result?.verdict} isScanning={isScanning} />
        </div>
      </div>

      {/* Main Verification Input Console Card */}
      <div className="beige-card mouse-spotlight rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-[#1C1917]">
            <Search className="w-4 h-4 text-amber-700" />
            <span>Interactive Verification Console</span>
          </div>

          {/* Clean Dropdown Filters */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#564735]">
              <Globe className="w-3.5 h-3.5 text-amber-700" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-1 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-xs"
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

            <div className="flex items-center gap-1.5 text-xs text-[#564735]">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-1 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-xs"
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
                placeholder="Enter publication title (e.g. 'Times India' or 'दैनिक भारत')..."
                className="w-full bg-white border border-[#DDD1BF] rounded-2xl px-5 py-3.5 text-[#1C1917] placeholder-[#A8A29E] text-base font-semibold focus:outline-none focus:border-amber-600 shadow-xs transition-all"
              />
              {inputTitle && (
                <button
                  onClick={() => setInputTitle('')}
                  className="absolute right-4 top-3.5 text-[#75634B] hover:text-[#1C1917] text-xs font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={() => handleVerify()}
              disabled={isScanning || !inputTitle.trim()}
              className="px-7 py-3.5 rounded-2xl font-bold text-sm bg-[#1C1917] hover:bg-[#382E22] disabled:opacity-50 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
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
            <div className="py-1 px-3 text-xs flex items-center gap-2 text-[#564735]">
              <span className="font-semibold text-amber-900">{detected.language}:</span>
              <code className="text-[#1C1917] font-mono bg-[#EFE8DC] px-2 py-0.5 rounded text-xs border border-[#DDD1BF]">
                {transliteratedPreview}
              </code>
            </div>
          )}
        </div>

        {/* 5-Stage Stepper Ribbon */}
        <div className="pt-2 border-t border-[#E8E0D2]">
          <div className="grid grid-cols-5 gap-2 text-xs">
            {PIPELINE_STAGES.map((stage) => {
              const isCurrent = activeStage === stage.num;
              const isDone = activeStage >= stage.num;
              return (
                <div
                  key={stage.num}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                      : isDone
                      ? 'bg-white border-[#E2D7C5] text-[#1C1917]'
                      : 'bg-[#F0EBE0]/50 border-transparent text-[#A8A29E]'
                  }`}
                >
                  <div className="text-[10px] font-mono text-[#75634B]">0{stage.num}</div>
                  <div className="text-xs truncate">{stage.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Verification Results Display */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Verdict Card */}
          <div className={`p-6 sm:p-7 rounded-3xl border ${
            result.verdict === 'APPROVED' ? 'beige-card-success' :
            result.verdict === 'REJECTED' ? 'beige-card-danger' : 'beige-card-warning'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`p-3.5 rounded-2xl text-white shadow-sm ${
                  result.verdict === 'APPROVED' ? 'bg-emerald-700' :
                  result.verdict === 'REJECTED' ? 'bg-rose-700' : 'bg-amber-600'
                }`}>
                  {result.verdict === 'APPROVED' && <CheckCircle2 className="w-8 h-8" />}
                  {result.verdict === 'REJECTED' && <XCircle className="w-8 h-8" />}
                  {result.verdict === 'MANUAL_REVIEW' && <AlertTriangle className="w-8 h-8" />}
                </div>

                <div>
                  <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded tracking-wide ${
                    result.verdict === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                    result.verdict === 'REJECTED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                    'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {result.verdict === 'APPROVED' && 'Approved • Clear for Registration'}
                    {result.verdict === 'REJECTED' && 'Rejected • High Conflict / Statutory Clash'}
                    {result.verdict === 'MANUAL_REVIEW' && 'Manual Review Required'}
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-poppins font-bold text-[#1C1917] mt-2">
                    "{result.inputTitle}"
                  </h3>
                  <p className="text-xs sm:text-sm text-[#44403C] mt-1 max-w-xl leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              </div>

              {/* Conflict Risk Score Gauge */}
              <div className="flex flex-col items-center justify-center bg-white px-6 py-4 rounded-2xl border border-[#DDD1BF] min-w-[140px] shadow-xs">
                <div className="text-[10px] font-mono font-bold text-[#75634B] uppercase tracking-wider">
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
            <div className="mt-5 pt-3.5 border-t border-[#E5DDD0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="text-[#564735]">
                <strong className="text-[#1C1917]">Guidance:</strong> {result.recommendedAction}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyVerificationReport}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#F8F6F0] text-[#564735] border border-[#DDD1BF] flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? 'Copied' : 'Copy'}</span>
                </button>

                {result.verdict === 'REJECTED' && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onNavigateToAgents(result.inputTitle);
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#1C1917] hover:bg-[#382E22] text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Safe Alternatives</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4-Dimensional Similarity Matrix & Clashing Records */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 4-D Similarity Breakdown */}
            <div className="lg:col-span-5 beige-card mouse-spotlight rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
                <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                  <span>4-Dimensional Similarity</span>
                </div>
                <span className="text-[10px] text-[#75634B] font-mono">NLP Engine</span>
              </div>

              <div className="space-y-3.5">
                {/* 1. Lexical */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-medium">Lexical Permutation</span>
                    <span className="font-mono font-bold text-amber-800">{result.similarityBreakdown.lexicalScore}%</span>
                  </div>
                  <div className="w-full bg-[#EFE8DC] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.lexicalScore}%` }}
                    />
                  </div>
                </div>

                {/* 2. Phonetic */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-medium">Phonetic Soundex</span>
                    <span className="font-mono font-bold text-purple-800">{result.similarityBreakdown.phoneticScore}%</span>
                  </div>
                  <div className="w-full bg-[#EFE8DC] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.phoneticScore}%` }}
                    />
                  </div>
                </div>

                {/* 3. Semantic */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-medium">Semantic Cross-Lingual</span>
                    <span className="font-mono font-bold text-emerald-800">{result.similarityBreakdown.semanticScore}%</span>
                  </div>
                  <div className="w-full bg-[#EFE8DC] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.semanticScore}%` }}
                    />
                  </div>
                </div>

                {/* 4. Core-Word */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-medium">Core Root Token</span>
                    <span className="font-mono font-bold text-stone-900">{result.similarityBreakdown.coreWordScore}%</span>
                  </div>
                  <div className="w-full bg-[#EFE8DC] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-stone-800 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.coreWordScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Extracted Core Root Tokens */}
              <div className="pt-2 border-t border-[#E8E0D2] text-xs flex items-center gap-2 flex-wrap">
                <span className="text-[#75634B] text-[11px]">Root Tokens:</span>
                {result.coreWords.map((word, idx) => (
                  <span key={idx} className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs">
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Clashing Titles Table */}
            <div className="lg:col-span-7 beige-card mouse-spotlight rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
                <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-700" />
                  <span>Top Registry Conflicts ({result.clashingTitles.length})</span>
                </div>
                <span className="text-[10px] text-[#75634B] font-mono">160k Registry</span>
              </div>

              {result.clashingTitles.length === 0 ? (
                <div className="p-8 text-center text-[#75634B] space-y-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-700 mx-auto" />
                  <p className="font-bold text-[#1C1917] text-sm">No Registered Conflicts</p>
                  <p className="text-xs text-[#75634B]">Title is distinct and conflict-free.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {result.clashingTitles.map((clash, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white border border-[#DDD1BF] flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1C1917] text-sm">
                            {clash.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F0EBE0] text-[#564735] font-mono">
                            {clash.regNo || clash.registration_number || 'REG-MASTER'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#75634B] mt-0.5">
                          {clash.language || 'English'} • {clash.state || clash.publication_state || 'National'} • {clash.reason}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-base font-extrabold font-mono ${
                          clash.similarity >= 80 ? 'text-rose-700' :
                          clash.similarity >= 50 ? 'text-amber-700' : 'text-stone-700'
                        }`}>
                          {clash.similarity}%
                        </span>
                        <div className="text-[9px] uppercase tracking-wider text-[#A8A29E] font-mono">
                          {clash.matchType}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Deterministic PRGI Government Rules Matrix */}
          <div className="beige-card mouse-spotlight rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
              <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Deterministic Statutory Compliance Checks</span>
              </div>
              <span className="text-[10px] text-[#75634B] font-mono">PRGI 2023 Act</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.ruleViolations.map((rule) => (
                <div
                  key={rule.ruleId}
                  className={`p-3.5 rounded-2xl border ${
                    rule.passed
                      ? 'bg-white border-[#E2D7C5]'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F8F6F0] text-[#75634B]">
                      {rule.ruleId}
                    </span>
                    {rule.passed ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Violation</span>
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-xs text-[#1C1917]">{rule.ruleName}</div>
                  <p className="text-[11px] text-[#564735] mt-1 line-clamp-2">
                    {rule.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
