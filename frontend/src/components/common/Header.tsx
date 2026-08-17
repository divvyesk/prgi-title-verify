import React from 'react';
import { 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Sliders, 
  PlayCircle,
  Layers,
  Sparkles,
  Search,
  UserCheck,
  Database
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface HeaderProps {
  activeTab: 'verifier' | 'agents' | 'officer' | 'registry';
  setActiveTab: (tab: 'verifier' | 'agents' | 'officer' | 'registry') => void;
  onOpenRoadmap: () => void;
  onReplayIntro: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  useLiveApi: boolean;
  setUseLiveApi: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenRoadmap,
  onReplayIntro,
  soundEnabled,
  setSoundEnabled,
  useLiveApi,
  setUseLiveApi
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.playClick();
  };

  const handleTabChange = (tab: 'verifier' | 'agents' | 'officer' | 'registry') => {
    sound.playClick();
    setActiveTab(tab);
  };

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-8 pt-3 pb-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 bg-[#FAF7F2]/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-[#E8E0D2] shadow-sm">
        
        {/* Brand Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => handleTabChange('verifier')}
        >
          <div className="w-9 h-9 rounded-xl bg-[#1C1917] flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-poppins font-bold text-base sm:text-lg text-[#1C1917] tracking-tight">
                Title<span className="text-amber-800">Guard</span>
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                PRGI 2023
              </span>
            </div>
            <p className="text-[10px] text-[#75634B] font-mono hidden md:block">
              Statutory Periodical Clearance
            </p>
          </div>
        </div>

        {/* Central Studio Nav Pills */}
        <nav className="flex items-center bg-[#EFE8DC]/80 p-1 rounded-xl border border-[#E2D7C5]">
          <button
            onClick={() => handleTabChange('verifier')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'verifier'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#75634B] hover:text-[#1C1917]'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-amber-700" />
            <span>Verifier</span>
          </button>

          <button
            onClick={() => handleTabChange('agents')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#75634B] hover:text-[#1C1917]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>AI Studio</span>
          </button>

          <button
            onClick={() => handleTabChange('officer')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'officer'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#75634B] hover:text-[#1C1917]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>Officer Docket</span>
          </button>

          <button
            onClick={() => handleTabChange('registry')}
            className={`hidden lg:flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#75634B] hover:text-[#1C1917]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-stone-700" />
            <span>Registry</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Live API Toggle */}
          <button 
            onClick={() => {
              setUseLiveApi(!useLiveApi);
              sound.playClick();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
              useLiveApi 
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                : 'bg-white/80 border-[#DDD1BF] text-[#75634B] hover:text-[#1C1917]'
            }`}
            title="Switch between FastAPI backend & embedded heuristics engine"
          >
            <Sliders className="w-3 h-3 text-amber-700" />
            <span>{useLiveApi ? 'FastAPI: 8000' : 'Offline'}</span>
          </button>

          {/* Sound Synthesizer */}
          <button
            onClick={toggleSound}
            aria-label="Toggle audio effects"
            className="p-2 rounded-xl text-[#75634B] hover:text-[#1C1917] hover:bg-[#EFE8DC] transition-colors border border-transparent hover:border-[#DDD1BF] cursor-pointer"
            title={soundEnabled ? 'Mute acoustic feedback' : 'Enable acoustic feedback'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-700" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Replay Intro */}
          <button
            onClick={onReplayIntro}
            aria-label="Replay intro animation"
            className="hidden sm:flex items-center gap-1 p-2 rounded-xl text-[#75634B] hover:text-[#1C1917] hover:bg-[#EFE8DC] transition-colors border border-transparent hover:border-[#DDD1BF] cursor-pointer"
            title="Replay cinematic intro"
          >
            <PlayCircle className="w-4 h-4 text-amber-700" />
          </button>

          {/* Roadmap Modal */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenRoadmap();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1C1917] hover:bg-[#382E22] text-white shadow-xs transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Roadmap</span>
          </button>
        </div>

      </div>
    </header>
  );
};
