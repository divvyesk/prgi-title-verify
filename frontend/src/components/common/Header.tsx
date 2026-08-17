import React from 'react';
import { 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Layers 
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface HeaderProps {
  activeTab: 'verifier' | 'agents' | 'officer' | 'registry';
  setActiveTab: (tab: 'verifier' | 'agents' | 'officer' | 'registry') => void;
  onOpenRoadmap: () => void;
  onReplayIntro?: () => void;
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
    <header className="sticky top-0 z-40 w-full px-6 sm:px-12 py-4 bg-[#FBF9F4]/90 backdrop-blur-sm border-b border-[#EDE8DF]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        
        {/* Distinctive Brand Typography */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none" 
          onClick={() => handleTabChange('verifier')}
        >
          <div className="w-8 h-8 rounded-lg bg-[#1C1917] flex items-center justify-center text-white">
            <ShieldCheck className="w-4 h-4 text-[#D97706]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
                TitleGuard
              </span>
              <span className="text-[11px] font-mono font-medium text-[#78716C] uppercase tracking-wider">
                PRGI
              </span>
            </div>
          </div>
        </div>

        {/* Clean Text Underline Navigation (No Boxed Inset Pills) */}
        <nav className="flex items-center gap-6 sm:gap-8">
          <button
            onClick={() => handleTabChange('verifier')}
            className={`relative py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'verifier'
                ? 'text-[#1C1917]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <span>Title Verifier</span>
            {activeTab === 'verifier' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1C1917] rounded-full" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('agents')}
            className={`relative py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'agents'
                ? 'text-[#1C1917]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <span>Agentic Studio</span>
            {activeTab === 'agents' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1C1917] rounded-full" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('officer')}
            className={`relative py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'officer'
                ? 'text-[#1C1917]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <span>Officer Docket</span>
            {activeTab === 'officer' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1C1917] rounded-full" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('registry')}
            className={`hidden sm:inline-block relative py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'registry'
                ? 'text-[#1C1917]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <span>Registry Explorer</span>
            {activeTab === 'registry' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1C1917] rounded-full" />
            )}
          </button>
        </nav>

        {/* Right Subtle Utility Controls */}
        <div className="flex items-center gap-3">
          {/* Live / Offline Toggle */}
          <button 
            onClick={() => {
              setUseLiveApi(!useLiveApi);
              sound.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              useLiveApi 
                ? 'bg-[#E6F4EA] text-[#137333]' 
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
            title="Toggle Live FastAPI Backend (82k pgvector) vs Local Engine"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{useLiveApi ? 'Live API (8000)' : 'Offline'}</span>
          </button>

          {/* Sound Synthesizer */}
          <button
            onClick={toggleSound}
            aria-label="Toggle audio feedback"
            className="p-1.5 text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute acoustic feedback' : 'Enable acoustic feedback'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          {/* Roadmap Modal */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenRoadmap();
            }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1C1917] hover:bg-[#EFEAE1] rounded-lg transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>
        </div>

      </div>
    </header>
  );
};
