import { useState } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { VerificationView } from './components/verifier/VerificationView';
import { AgenticStudio } from './components/agents/AgenticStudio';
import { OfficerDashboard } from './components/officer/OfficerDashboard';
import { RegistryExplorer } from './components/registry/RegistryExplorer';
import { RoadmapModal } from './components/roadmap/RoadmapModal';
import { DynamicBeigeBackground } from './components/canvas/DynamicBeigeBackground';
import { LoadingIntro } from './components/loading/LoadingIntro';

export function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('skipIntro') !== '1';
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState<'verifier' | 'agents' | 'officer' | 'registry'>('verifier');
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [useLiveApi, setUseLiveApi] = useState(false);
  const [agentSeedTitle, setAgentSeedTitle] = useState('');
  const [verifierInitialTitle, setVerifierInitialTitle] = useState('Times India');

  const handleNavigateToAgents = (seedTitle?: string) => {
    if (seedTitle) setAgentSeedTitle(seedTitle);
    setActiveTab('agents');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTitleForVerification = (title: string) => {
    setVerifierInitialTitle(title);
    setActiveTab('verifier');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#292524] flex flex-col relative selection:bg-[#E2D7C5] selection:text-[#1C1917]">
      {/* Cool Cinematic Loading Intro Screen */}
      {showIntro && (
        <LoadingIntro onComplete={() => setShowIntro(false)} />
      )}

      {/* Dynamic Ambient Beige 3D Background */}
      <DynamicBeigeBackground />

      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenRoadmap={() => setRoadmapOpen(true)}
        onReplayIntro={() => setShowIntro(true)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        useLiveApi={useLiveApi}
        setUseLiveApi={setUseLiveApi}
      />

      {/* Main Content Area */}
      <main className="flex-1 z-10 relative">
        {activeTab === 'verifier' && (
          <VerificationView
            onNavigateToAgents={handleNavigateToAgents}
            useLiveApi={useLiveApi}
            initialTitle={verifierInitialTitle}
          />
        )}

        {activeTab === 'agents' && (
          <AgenticStudio
            initialSeed={agentSeedTitle}
            onSelectTitleForVerification={handleSelectTitleForVerification}
          />
        )}

        {activeTab === 'officer' && (
          <OfficerDashboard />
        )}

        {activeTab === 'registry' && (
          <RegistryExplorer />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* 6-Member Roadmap Interactive Modal */}
      <RoadmapModal
        isOpen={roadmapOpen}
        onClose={() => setRoadmapOpen(false)}
      />
    </div>
  );
}

export default App;

