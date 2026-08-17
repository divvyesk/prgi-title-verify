import React from 'react';
import { 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Layers, 
  Search, 
  Sparkles, 
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
    <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3 bg-[#F8F6F0]/95 backdrop-blur-md border-b border-[#E7E5E4]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand & Statutory Identity */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => handleTabChange('verifier')}
        >
          <div className="w-9 h-9 rounded-xl bg-[#1C1917] flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg text-[#1C1917] tracking-tight">
                TitleGuard
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EFE8DC] text-[#44403C] border border-[#DDD1BF]">
                PRGI
              </span>
            </div>
            <p className="text-[11px] text-[#78716C] font-medium hidden md:block">
              Press Registrar General of India · Automated Clearance
            </p>
          </div>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="flex items-center bg-[#EAE6DF] p-1 rounded-xl border border-[#DDD6CE]">
          <button
            onClick={() => handleTabChange('verifier')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'verifier'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-amber-700" />
            <span>Title Verifier</span>
          </button>

          <button
            onClick={() => handleTabChange('agents')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Agentic Studio</span>
          </button>

          <button
            onClick={() => handleTabChange('officer')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'officer'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Officer Docket</span>
          </button>

          <button
            onClick={() => handleTabChange('registry')}
            className={`hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-amber-700" />
            <span>82k Registry</span>
          </button>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Live / Offline Toggle */}
          <button 
            onClick={() => {
              setUseLiveApi(!useLiveApi);
              sound.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              useLiveApi 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-white border-[#D6D3D1] text-[#57534E] hover:text-[#1C1917]'
            }`}
            title="Toggle Live FastAPI Backend (82k pgvector) vs Local Heuristic Engine"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-700" />
            <span>{useLiveApi ? 'Live API (8000)' : 'Offline Engine'}</span>
          </button>

          {/* Sound Synthesizer */}
          <button
            onClick={toggleSound}
            aria-label="Toggle audio feedback"
            className="p-2 rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE6DF] transition-colors border border-transparent hover:border-[#D6D3D1] cursor-pointer"
            title={soundEnabled ? 'Mute acoustic feedback' : 'Enable acoustic feedback'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-700" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          {/* Roadmap Modal */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenRoadmap();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1C1917] hover:bg-[#382E22] text-white shadow-xs transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">System Spec</span>
          </button>
        </div>

      </div>
    </header>
  );
};
