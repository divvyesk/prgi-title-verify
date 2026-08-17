import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, Cpu, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { sound } from '../../utils/audio';

interface LoadingIntroProps {
  onComplete: () => void;
}

const SAMPLE_MASTHEAD_TITLES = [
  { title: 'THE NATIONAL CHRONICLE', sub: 'Newspaper & Periodical Master Registry', lang: 'English' },
  { title: 'दैनिक भारत समाचार', sub: 'PRGI Cross-Lingual Script Detection', lang: 'Devanagari' },
  { title: 'TIMES OF BHARAT GAZETTE', sub: '4-D Anagram & Phonetic Matrix', lang: 'Bilingual' },
];

export const LoadingIntro: React.FC<LoadingIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'scanning' | 'shaking' | 'zooming' | 'completed'>('scanning');
  const [progress, setProgress] = useState(0);
  const [titleIdx, setTitleIdx] = useState(0);
  const [telemetryText, setTelemetryText] = useState('Initializing 160,000 Title Embeddings Index...');

  useEffect(() => {
    // Play initial sound
    sound.playScan();

    // Progress counter timer
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 4;
      });
    }, 40);

    // Telemetry log timeline
    const t1 = setTimeout(() => {
      setTelemetryText('Analyzing Phonetic Soundex & Lexical Levenshtein Tensors...');
      setTitleIdx(1);
    }, 600);

    const t2 = setTimeout(() => {
      setTelemetryText('Cross-Lingual Semantic Concept Matrix: Active...');
      setTitleIdx(2);
    }, 1100);

    // Phase 2: Jitter & Convergence Shake at 1.4s
    const t3 = setTimeout(() => {
      setPhase('shaking');
      sound.playJitter();
      setTelemetryText('RESONANCE CONVERGENCE DETECTED • LOCKING EMBEDDINGS');
    }, 1400);

    // Lock sound at 1.9s
    const t4 = setTimeout(() => {
      sound.playLock();
      setTelemetryText('VERIFICATION HASH VERIFIED • PRGI ACT 2023 COMPLIANT');
    }, 1900);

    // Phase 3: Zoom In at 2.3s
    const t5 = setTimeout(() => {
      setPhase('zooming');
      sound.playZoom();
    }, 2300);

    // Complete at 2.8s
    const t6 = setTimeout(() => {
      setPhase('completed');
      onComplete();
    }, 2800);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [onComplete]);

  const handleSkip = () => {
    sound.playClick();
    onComplete();
  };

  const currentTitle = SAMPLE_MASTHEAD_TITLES[titleIdx];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F8F6F0] overflow-hidden transition-all duration-700 ${
        phase === 'zooming' ? 'opacity-0 scale-125 filter blur-sm pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient warm lighting backdrop */}
      <div className="absolute inset-0 bg-warm-mesh opacity-70 pointer-events-none"></div>
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-200/40 via-orange-100/30 to-transparent blur-3xl pointer-events-none"></div>

      {/* Top Header Bar */}
      <div className="absolute top-6 inset-x-6 max-w-5xl mx-auto flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#B45309] text-white flex items-center justify-center shadow-md shadow-amber-900/10">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-[#564735]">
              Press Registrar General of India
            </div>
            <div className="text-[10px] text-[#948063] font-mono">
              Statutory Periodical Title Clearance System
            </div>
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="px-4 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#75634B] hover:text-[#1C1917] border border-[#E2D7C5] shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span>Skip Intro</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Central Scanning Container */}
      <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center">
        {/* Newspaper Masthead Card */}
        <div
          className={`relative w-full rounded-2xl bg-white border border-[#E2D7C5] p-8 sm:p-10 shadow-2xl shadow-stone-900/10 overflow-hidden transition-transform duration-300 ${
            phase === 'shaking' ? 'animate-shake-violent border-amber-500 shadow-amber-500/20' : 'animate-float-slow'
          } ${phase === 'zooming' ? 'scale-150 duration-700 ease-in' : ''}`}
        >
          {/* Top Vintage Rule Header */}
          <div className="border-b border-[#E8E0D2] pb-3 mb-6 flex items-center justify-between text-[11px] text-[#75634B] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="font-bold">VOL. XXIV • NO. 142</span>
            </div>
            <div className="uppercase tracking-wider font-semibold">
              PRGI VERIFICATION SPECIMEN
            </div>
            <div className="flex items-center gap-1 text-[#047857] font-bold">
              <Lock className="w-3 h-3" />
              <span>ACT 2023</span>
            </div>
          </div>

          {/* Masthead Title Display */}
          <div className="text-center py-6 px-2 relative">
            <div className="text-[11px] uppercase tracking-widest text-[#B45309] font-bold mb-2 font-mono">
              [ PROPOSED CANDIDATE TITLE ]
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-editorial font-extrabold text-[#1C1917] tracking-tight leading-none mb-3">
              {currentTitle.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#75634B] font-serif italic max-w-md mx-auto">
              "{currentTitle.sub}"
            </p>
          </div>

          {/* Laser Scanning Line Beam */}
          {phase === 'scanning' && (
            <div className="absolute inset-x-0 h-1 shimmer-laser animate-scan-line pointer-events-none z-20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#B45309] text-white text-[9px] font-mono uppercase tracking-wider shadow-md">
                Laser Scanning 4-D Matrix
              </div>
            </div>
          )}

          {/* Jitter / Shaking Optical Reticle Overlay */}
          {phase === 'shaking' && (
            <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center z-20 animate-pulse">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#B45309] animate-spin flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#B45309]/20 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-[#B45309]" />
                </div>
              </div>
              <span className="mt-3 px-3 py-1 rounded-full bg-[#B45309] text-white font-mono text-[11px] font-bold shadow-lg">
                TARGET LOCKED • CONVERGING SIMILARITY
              </span>
            </div>
          )}

          {/* Bottom Card Footer */}
          <div className="border-t border-[#E8E0D2] pt-4 mt-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#75634B]">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Language: <strong>{currentTitle.lang}</strong></span>
            </div>
            <div className="font-mono text-[10px] text-[#948063]">
              82,713 Master Records Loaded
            </div>
            <div className="flex items-center gap-1 text-[#047857] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>NLP Cross-Lingual Sync</span>
            </div>
          </div>
        </div>

        {/* Real-time Telemetry & Progress */}
        <div className="w-full max-w-lg mt-8 space-y-3 text-center">
          {/* Status Text */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#564735]">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
            <span className="font-semibold">{telemetryText}</span>
          </div>

          {/* Elegant Progress Bar */}
          <div className="w-full bg-[#E8E0D2] h-2 rounded-full overflow-hidden p-0.5 border border-[#E2D7C5]">
            <div
              className="bg-gradient-to-r from-amber-600 to-emerald-600 h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center text-[11px] text-[#948063] font-mono">
            <span>Stage 1 to 5 Pipeline</span>
            <span className="font-bold text-[#1C1917]">{progress}%</span>
            <span>PRGI Guard Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
