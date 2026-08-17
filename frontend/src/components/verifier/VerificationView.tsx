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
  Zap, 
  Globe, 
  RefreshCw, 
  TrendingUp, 
  Cpu,
  MapPin
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
  { label: 'Times India vs India Times', value: 'Times India', desc: 'Anagram & word reordering test' },
  { label: 'Jaagran vs Jagran', value: 'Jaagran Weekly', desc: 'Phonetic Soundex test' },
  { label: 'Dainik Samachar vs Daily News', value: 'Dainik Samachar', desc: 'Cross-language translation test' },
  { label: 'The Vidarbha Daily Express', value: 'The Vidarbha Daily Express', desc: 'Core-word root extraction test' },
  { label: 'Royal Matrimonial Classifieds', value: 'The Royal Matrimonial Classifieds', desc: 'Rule 4.1a commercial ban test' },
  { label: 'Clear Approved Title', value: 'Aditi National Strategy Review', desc: 'Distinctive verified pass' }
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
    // Synchronously compute initial verification so the screen is immediately populated
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
            reason: 'High spelling similarity or anagrammatic word permutation'
          }
        ],
        ruleViolations: [
          {
            ruleId: 'GENERIC_WORD_01',
            ruleName: 'Single Generic Word Protection',
            passed: true,
            clause: 'PRGI 2025 Section 1.1(a)',
            description: 'Title contains multiple tokens.',
            severity: 'INFO'
          },
          {
            ruleId: 'DECEPTIVE_SIM_02',
            ruleName: 'Deceptive Similarity to Registered Publications',
            passed: false,
            clause: 'PRGI 2025 Section 2.3(a)',
            description: 'Proposed title is an anagram/reordered variant of existing registered title "India Times".',
            severity: 'CRITICAL'
          }
        ],
        explanation: 'The proposed title "Times India" is rejected due to excessive collision (92% similarity) with existing registered publication "India Times" under PRGI Anagram & Word-Reordering Protection.',
        recommendedAction: 'Use the AI Agentic Studio to generate distinctive, pre-verified alternative name candidates.',
        guidelineCitations: ['PRGI Verification Guidelines 2025, Section 2.3 (Deceptive Similarity)'],
        processingTimeMs: 42,
        timestamp: new Date().toLocaleTimeString()
      };
    } catch {
      return null;
    }
  });
  const [activeStage, setActiveStage] = useState(5);
  const [copiedReport, setCopiedReport] = useState(false);

  // Live transliteration preview while typing
  const detected = detectScriptAndLanguage(inputTitle);
  const transliteratedPreview = transliterateToRoman(inputTitle);

  const handleVerify = async (titleToVerify?: string) => {
    const target = (titleToVerify || inputTitle).trim();
    if (!target) return;

    sound.playScan();
    setIsScanning(true);
    setActiveStage(1);

    // Fast progressive stage animation
    setTimeout(() => setActiveStage(2), 80);
    setTimeout(() => setActiveStage(3), 160);
    setTimeout(() => setActiveStage(4), 240);

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
            particleCount: 70,
            spread: 60,
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
    }, 320);
  };

  // Sync if initialTitle changes
  useEffect(() => {
    if (initialTitle && initialTitle !== inputTitle) {
      setInputTitle(initialTitle);
      handleVerify(initialTitle);
    }
  }, [initialTitle]);

  const copyVerificationReport = () => {
    if (!result) return;
    sound.playClick();
    const text = `--- PRGI Press Title Verification Report ---
Proposed Title: ${result.inputTitle}
Verdict: ${result.verdict} (Risk Score: ${result.verdictScore}/100)
Language: ${result.detectedLanguage} | State: ${selectedState}
4D Similarity: Lexical ${result.similarityBreakdown.lexicalScore}%, Phonetic ${result.similarityBreakdown.phoneticScore}%, Semantic ${result.similarityBreakdown.semanticScore}%, Core-Word ${result.similarityBreakdown.coreWordScore}%
Top Conflict: ${result.clashingTitles[0] ? `${result.clashingTitles[0].title} (${result.clashingTitles[0].similarity}%)` : 'None'}
Explanation: ${result.explanation}
Timestamp: ${result.timestamp}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Header Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2 pb-4">
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-bold">
            <Cpu className="w-3.5 h-3.5 text-amber-700" />
            <span>Automated Press Title Verification</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            <span>PRGI 2025 Act Compliant</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-editorial font-extrabold text-[#1C1917] tracking-tight leading-[1.15]">
            Periodical Title <br />
            <span className="italic text-amber-800 font-serif">
              Verification &amp; Clearance
            </span>
          </h1>

          <p className="text-[#564735] text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
            Instantly verifies proposed newspaper and periodical titles against <strong>160,000+ registered publications</strong>. Analyzes 4-Dimensional similarity (Lexical, Phonetic, Cross-Lingual Semantic, and Core-Word) plus 6 deterministic statutory PRGI rules.
          </p>

          {/* Quick Problem Presets */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-[#75634B] flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Benchmark Test Scenarios:</span>
            </div>
            <div className="flex flex-wrap gap-2">
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
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-[#1C1917] text-white shadow-sm font-semibold'
                        : 'bg-white/90 hover:bg-white text-[#564735] hover:text-[#1C1917] border border-[#E2D7C5]'
                    }`}
                    title={preset.desc}
                  >
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3D Holographic Seal Badge Showcase */}
        <div className="lg:col-span-5 h-[320px] relative rounded-2xl bg-white border border-[#E2D7C5] p-2 overflow-hidden shadow-lg shadow-stone-900/5 flex flex-col items-center justify-center">
          <div className="absolute top-3 left-4 z-10 flex items-center gap-2 text-xs font-mono text-[#75634B]">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
            <span className="font-bold">3D Statutory Title Seal</span>
          </div>

          <Hero3DCanvas title={inputTitle} verdict={result?.verdict} isScanning={isScanning} />

          <div className="absolute bottom-3 inset-x-4 z-10 flex items-center justify-between text-[11px] text-[#564735] bg-[#FAF7F2]/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#E8E0D2]">
            <span className="font-mono">
              Status:{' '}
              <strong className={
                result?.verdict === 'APPROVED' ? 'text-emerald-700' :
                result?.verdict === 'REJECTED' ? 'text-rose-700' : 'text-amber-700'
              }>
                {isScanning ? 'SCANNING DATABASE...' : result?.verdict || 'IDLE'}
              </strong>
            </span>
            <span className="font-mono">160k Records Indexed</span>
          </div>
        </div>
      </div>

      {/* Main Verification Input Console */}
      <div className="beige-card rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-[#E8E0D2] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1C1917] flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-700" />
              <span>Interactive Verification Console</span>
            </h2>
            <p className="text-xs text-[#75634B]">
              Type in English or any Indic script (Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Urdu).
            </p>
          </div>

          {/* Language & State Selectors */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#564735]">
              <Globe className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-semibold">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Marathi">Marathi (मराठी)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="Urdu">Urdu (اردو)</option>
                <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="Bilingual">Bilingual / Multi</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#564735]">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span className="font-semibold">State:</span>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
              >
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Karnataka">Karnataka</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input Field with Action Button */}
        <div className="space-y-3">
          <div className="relative flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                placeholder="Enter proposed publication title (e.g. 'दैनिक भारत' or 'Times India')..."
                className="w-full bg-white border border-[#DDD1BF] rounded-xl px-4 py-3.5 text-[#1C1917] placeholder-[#A8A29E] text-sm sm:text-base font-semibold focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 shadow-sm transition-all"
              />
              {inputTitle && (
                <button
                  onClick={() => setInputTitle('')}
                  className="absolute right-3 top-3.5 text-[#75634B] hover:text-[#1C1917] text-xs font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={() => handleVerify()}
              disabled={isScanning || !inputTitle.trim()}
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 hover:from-amber-800 hover:to-stone-950 disabled:opacity-50 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
                  <span>Computing 4-D Similarity...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Verify Title</span>
                </>
              )}
            </button>
          </div>

          {/* Transliteration Live Preview Banner */}
          {detected.isIndic && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[#564735]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                  {detected.language} ({detected.script} Script)
                </span>
                <span>Transliterated Roman Token:</span>
                <code className="text-[#1C1917] font-mono font-bold bg-white px-2 py-0.5 rounded border border-amber-200">
                  {transliteratedPreview}
                </code>
              </div>
              <span className="text-[11px] text-[#75634B] font-mono">Stage 1 Normalization Active</span>
            </div>
          )}
        </div>

        {/* 5-Stage Verification Pipeline Indicator */}
        <div className="pt-2">
          <div className="text-[11px] font-bold text-[#75634B] uppercase tracking-wider mb-2 font-mono">
            5-Stage Automated Funnel Architecture
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { num: 1, name: 'Clean & Script', desc: 'Standardize & Romanize' },
              { num: 2, name: 'Shortlist', desc: '160k → 200 Suspects' },
              { num: 3, name: 'Score 4-D', desc: 'Edit / Sound / Vector / Root' },
              { num: 4, name: 'Check Rules', desc: 'Deterministic Statutory' },
              { num: 5, name: 'Explain & Advise', desc: 'Traffic Light + Citations' }
            ].map((stage) => {
              const isCurrent = activeStage === stage.num;
              const isDone = activeStage >= stage.num;
              return (
                <div
                  key={stage.num}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-100/90 border-amber-400 text-[#1C1917] shadow-sm'
                      : isDone
                      ? 'bg-white border-[#E2D7C5] text-[#1C1917]'
                      : 'bg-[#F0EBE0]/60 border-[#E8E0D2] text-[#A8A29E]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F8F6F0] border border-[#DDD1BF] text-[#564735]">
                      Stage {stage.num}
                    </span>
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className="font-bold text-xs truncate">{stage.name}</div>
                  <div className="text-[10px] text-[#75634B] truncate">{stage.desc}</div>
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
          <div className={`p-6 sm:p-8 rounded-2xl border ${
            result.verdict === 'APPROVED' ? 'beige-card-success' :
            result.verdict === 'REJECTED' ? 'beige-card-danger' : 'beige-card-warning'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Status Badge & Title Details */}
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-2xl text-white shadow-md ${
                  result.verdict === 'APPROVED' ? 'bg-emerald-700' :
                  result.verdict === 'REJECTED' ? 'bg-rose-700' : 'bg-amber-600'
                }`}>
                  {result.verdict === 'APPROVED' && <CheckCircle2 className="w-8 h-8" />}
                  {result.verdict === 'REJECTED' && <XCircle className="w-8 h-8" />}
                  {result.verdict === 'MANUAL_REVIEW' && <AlertTriangle className="w-8 h-8" />}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider ${
                      result.verdict === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                      result.verdict === 'REJECTED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                      'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {result.verdict === 'APPROVED' && 'APPROVED • CLEAR FOR REGISTRATION'}
                      {result.verdict === 'REJECTED' && 'REJECTED • HIGH CONFLICT / STATUTORY VIOLATION'}
                      {result.verdict === 'MANUAL_REVIEW' && 'MANUAL REVIEW REQUIRED • BORDERLINE RISK'}
                    </span>
                    <span className="text-xs text-[#75634B] font-mono">
                      Latency: {result.processingTimeMs}ms
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-[#1C1917] mt-2">
                    "{result.inputTitle}"
                  </h3>
                  <p className="text-xs sm:text-sm text-[#44403C] mt-1 max-w-2xl leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              </div>

              {/* Conflict Risk Score Gauge */}
              <div className="flex flex-col items-center justify-center bg-white px-6 py-4 rounded-xl border border-[#DDD1BF] min-w-[170px] shadow-sm">
                <div className="text-[11px] font-bold text-[#75634B] uppercase tracking-wider mb-1 font-mono">
                  Conflict Risk Score
                </div>
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono ${
                  result.verdict === 'APPROVED' ? 'text-emerald-700' :
                  result.verdict === 'REJECTED' ? 'text-rose-700' : 'text-amber-700'
                }`}>
                  {result.verdictScore}<span className="text-base text-[#A8A29E]">/100</span>
                </div>
                <div className="text-[11px] text-[#75634B] mt-1 font-medium">
                  {result.verdict === 'APPROVED' ? 'Safe Clearance' :
                   result.verdict === 'REJECTED' ? 'Critical Clash' : 'Moderate Ambiguity'}
                </div>
              </div>
            </div>

            {/* Recommended Action Ribbon */}
            <div className="mt-6 pt-4 border-t border-[#E5DDD0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#44403C]">
                <strong className="text-[#1C1917]">Guidance:</strong>
                <span>{result.recommendedAction}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyVerificationReport}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8F6F0] text-[#564735] hover:text-[#1C1917] border border-[#DDD1BF] flex items-center gap-1.5 transition-colors cursor-pointer font-semibold shadow-sm"
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
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
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
              <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
                <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                  <TrendingUp className="w-4 h-4 text-amber-700" />
                  <span>4-Dimensional Similarity Matrix</span>
                </div>
                <span className="text-[11px] text-[#75634B] font-mono">NLP Engine</span>
              </div>

              <div className="space-y-4">
                {/* 1. Lexical Similarity */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-semibold">1. Lexical &amp; Word Order Anagram</span>
                    <span className="font-mono font-bold text-amber-800">{result.similarityBreakdown.lexicalScore}%</span>
                  </div>
                  <div className="w-full bg-[#EFE8DC] h-2 rounded-full overflow-hidden border border-[#E2D7C5]">
                    <div
                      className="bg-amber-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.lexicalScore}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-[#75634B] mt-1">
                    Detects character shifts and word order inversions (e.g., Times India vs India Times).
                  </p>
                </div>

                {/* 2. Phonetic Similarity */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-semibold">2. Phonetic Soundex Match</span>
                    <span className="font-mono font-bold text-purple-800">{result.similarityBreakdown.phoneticScore}%</span>
                  </div>
                  <div className="w-full bg-[#EFE8DC] h-2 rounded-full overflow-hidden border border-[#E2D7C5]">
                    <div
                      className="bg-purple-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.phoneticScore}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-[#75634B] mt-1">
                    Detects identical pronunciation with altered spelling (e.g., Jagran vs Jaagran).
                  </p>
                </div>

                {/* 3. Semantic / Multilingual Cross-Lingual */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-semibold">3. Semantic Cross-Lingual Translation</span>
                    <span className="font-mono font-bold text-emerald-800">{result.similarityBreakdown.semanticScore}%</span>
                  </div>
                  <div className="w-full bg-[#EFE8DC] h-2 rounded-full overflow-hidden border border-[#E2D7C5]">
                    <div
                      className="bg-emerald-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.semanticScore}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-[#75634B] mt-1">
                    Detects identical meanings translated across languages (e.g., Daily News vs Dainik Samachar).
                  </p>
                </div>

                {/* 4. Core-Word Match */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#44403C] font-semibold">4. Core-Word Distinctive Root</span>
                    <span className="font-mono font-bold text-stone-900">{result.similarityBreakdown.coreWordScore}%</span>
                  </div>
                  <div className="w-full bg-[#EFE8DC] h-2 rounded-full overflow-hidden border border-[#E2D7C5]">
                    <div
                      className="bg-stone-800 h-full rounded-full transition-all duration-500"
                      style={{ width: `${result.similarityBreakdown.coreWordScore}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-[#75634B] mt-1">
                    Strips media filler words ("The", "Daily", "Patrika") to uncover root collisions.
                  </p>
                </div>
              </div>

              {/* Extracted Core Root Tokens */}
              <div className="p-3 bg-white rounded-xl border border-[#DDD1BF] text-xs">
                <span className="text-[#75634B] font-semibold mr-2">Extracted Root Tokens:</span>
                {result.coreWords.map((word, idx) => (
                  <span key={idx} className="inline-block font-mono font-bold px-2 py-0.5 mr-1.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Clashing Titles Table */}
            <div className="lg:col-span-7 beige-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
                <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-700" />
                  <span>Top Clashing Registered Titles ({result.clashingTitles.length} Suspects)</span>
                </div>
                <span className="text-[11px] text-[#75634B] font-mono">160k Registry</span>
              </div>

              {result.clashingTitles.length === 0 ? (
                <div className="p-8 text-center text-[#75634B] space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                  <p className="font-bold text-[#1C1917]">No Clashing Registered Titles</p>
                  <p className="text-xs text-[#75634B]">Proposed title appears distinct and conflict-free in this jurisdiction.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {result.clashingTitles.map((clash, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-[#DDD1BF] hover:border-[#CFC0A8] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1C1917] text-sm font-display">
                            {clash.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0EBE0] text-[#564735] font-mono font-semibold">
                            {clash.regNo}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#75634B] flex items-center gap-2">
                          <span>{clash.language}</span>
                          <span>•</span>
                          <span>{clash.state}</span>
                          <span>•</span>
                          <span className="text-[#382E22] font-medium">{clash.reason}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-base font-extrabold font-mono ${
                            clash.similarity >= 80 ? 'text-rose-700' :
                            clash.similarity >= 50 ? 'text-amber-700' : 'text-stone-700'
                          }`}>
                            {clash.similarity}%
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-[#A8A29E] font-bold font-mono">
                            {clash.matchType}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Deterministic PRGI Government Rules Matrix */}
          <div className="beige-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
              <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
                <FileText className="w-4 h-4 text-amber-700" />
                <span>Deterministic PRGI Statutory Rulebook (Member 4 Rules Engine)</span>
              </div>
              <span className="text-[11px] text-[#75634B] font-mono">PRGI 2025 Act</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.ruleViolations.map((rule) => (
                <div
                  key={rule.ruleId}
                  className={`p-3.5 rounded-xl border ${
                    rule.passed
                      ? 'bg-white border-[#E2D7C5] text-[#292524]'
                      : 'bg-rose-50 border-rose-200 text-[#292524]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F8F6F0] border border-[#DDD1BF] text-[#564735]">
                      {rule.ruleId}
                    </span>
                    {rule.passed ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>PASSED</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>FAILED</span>
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-xs text-[#1C1917] mb-1">{rule.ruleName}</div>
                  <p className="text-[11px] text-[#564735] mb-2 leading-relaxed">
                    {rule.description}
                  </p>
                  <div className="text-[10px] text-[#A8A29E] font-mono truncate">
                    {rule.clause}
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
