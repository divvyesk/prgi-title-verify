import React, { useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  UserCheck, 
  Calendar, 
  MapPin, 
  Globe, 
  Clock, 
  FileCheck2
} from 'lucide-react';
import type { OfficerCase, VerificationResult } from '../../types';
import { 
  SimilarityMatrix, 
  ClashingTitlesList, 
  RuleViolationsGrid, 
  VerdictBanner 
} from '../shared';
import reviewFixtureRaw from '../../data/verify_review.json';
import rejectedFixtureRaw from '../../data/verify_rejected.json';
import approvedFixtureRaw from '../../data/verify_approved.json';
import { sound } from '../../utils/audio';

export interface CaseDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: OfficerCase | null;
  triggerElement?: HTMLElement | null;
}

const reviewFixture = reviewFixtureRaw as unknown as VerificationResult;
const rejectedFixture = rejectedFixtureRaw as unknown as VerificationResult;
const approvedFixture = approvedFixtureRaw as unknown as VerificationResult;

export const CaseDetailDrawer: React.FC<CaseDetailDrawerProps> = ({
  isOpen,
  onClose,
  caseData,
  triggerElement
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Load and adapt evidence based on the case verdict
  const evidence = useMemo<VerificationResult | null>(() => {
    if (!caseData) return null;

    let base: VerificationResult;
    if (caseData.verdict === 'MANUAL_REVIEW') {
      base = reviewFixture;
    } else if (caseData.verdict === 'REJECTED') {
      base = rejectedFixture;
    } else {
      base = approvedFixture;
    }

    // Merge specific case fields to represent this title
    return {
      ...base,
      inputTitle: caseData.proposedTitle,
      normalizedTitle: caseData.proposedTitle.toLowerCase().trim(),
      detectedLanguage: caseData.language || base.detectedLanguage,
      verdict: caseData.verdict,
      verdictScore: caseData.riskScore,
      timestamp: caseData.submissionDate || base.timestamp
    };
  }, [caseData]);

  // Handle ESC key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the drawer or close button on open
    const focusTimer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (drawerRef.current) {
        drawerRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        sound.playClick();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);

      // Return focus to triggering row on close
      if (triggerElement) {
        triggerElement.focus();
      }
    };
  }, [isOpen, onClose, triggerElement]);

  if (!isOpen || !caseData || !evidence) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity"
        onClick={() => {
          sound.playClick();
          onClose();
        }}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="relative w-full max-w-4xl bg-[#FAF7F2] border-l border-[#E8E0D2] shadow-2xl flex flex-col h-full z-10 focus:outline-none overflow-y-auto"
      >
        {/* Drawer Sticky Header */}
        <div className="sticky top-0 z-20 bg-[#F0EBE0]/95 backdrop-blur-md px-6 py-4 border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 border border-purple-300 text-purple-900">
              <UserCheck className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#75634B] bg-white px-2 py-0.5 rounded border border-[#DDD1BF]">
                  {caseData.id}
                </span>
                <span className="text-xs text-[#75634B] font-mono">
                  Dossier Evidence View
                </span>
              </div>
              <h2 id="drawer-title" className="text-lg sm:text-xl font-editorial font-bold text-[#1C1917] mt-0.5">
                "{caseData.proposedTitle}"
              </h2>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="Close Case Evidence Dossier"
            className="p-2.5 rounded-xl bg-white hover:bg-[#E8E0D2] text-[#564735] hover:text-[#1C1917] border border-[#DDD1BF] shadow-sm transition-all cursor-pointer focus:ring-2 focus:ring-amber-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          {/* Metadata Dossier Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white border border-[#DDD1BF] shadow-sm">
              <div className="text-[#75634B] text-[10px] font-semibold flex items-center gap-1">
                <FileCheck2 className="w-3 h-3 text-amber-700" />
                <span>Applicant</span>
              </div>
              <div className="font-bold text-[#1C1917] truncate mt-0.5">{caseData.applicantName}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#DDD1BF] shadow-sm">
              <div className="text-[#75634B] text-[10px] font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-700" />
                <span>Jurisdiction</span>
              </div>
              <div className="font-bold text-[#1C1917] truncate mt-0.5">{caseData.state}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#DDD1BF] shadow-sm">
              <div className="text-[#75634B] text-[10px] font-semibold flex items-center gap-1">
                <Globe className="w-3 h-3 text-purple-700" />
                <span>Language &amp; Periodicity</span>
              </div>
              <div className="font-bold text-[#1C1917] truncate mt-0.5">{caseData.language} • {caseData.periodicity}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#DDD1BF] shadow-sm">
              <div className="text-[#75634B] text-[10px] font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-800" />
                <span>Submitted</span>
              </div>
              <div className="font-bold text-[#1C1917] truncate mt-0.5">{caseData.submissionDate}</div>
            </div>
          </div>

          {/* 1. Main Verdict Banner with explicit text label */}
          <VerdictBanner
            verdict={evidence.verdict}
            verdictScore={evidence.verdictScore}
            explanation={evidence.explanation}
            recommendedAction={evidence.recommendedAction}
            inputTitle={evidence.inputTitle}
            processingTimeMs={evidence.processingTimeMs}
          />

          {/* 2. 4-Dimensional Similarity Matrix */}
          <SimilarityMatrix
            similarityBreakdown={evidence.similarityBreakdown}
            coreWords={evidence.coreWords}
            badgeLabel="4D Composite"
          />

          {/* 3. Top Clashing Registered Titles List */}
          <ClashingTitlesList
            clashingTitles={evidence.clashingTitles}
            maxItems={5}
            badgeLabel="Verified Conflicts"
          />

          {/* 4. Deterministic Statutory Rules Matrix */}
          <RuleViolationsGrid
            ruleViolations={evidence.ruleViolations}
            badgeLabel="Statutory Audit"
          />
        </div>

        {/* Drawer Sticky Footer */}
        <div className="sticky bottom-0 z-20 bg-[#F0EBE0]/95 backdrop-blur-md px-6 py-4 border-t border-[#E5DDD0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#75634B]">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Audit record synced with PRGI verification pipeline</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1C1917] text-white hover:bg-stone-800 shadow-sm transition-all cursor-pointer focus:ring-2 focus:ring-amber-600 focus:outline-none"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
