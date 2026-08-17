import React, { useEffect, useRef, useMemo, useState } from 'react';
import { 
  X, 
  UserCheck, 
  Calendar, 
  MapPin, 
  Globe, 
  Clock, 
  FileCheck2, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Edit3,
  Award,
  FileSignature
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

export interface DecisionResultInfo {
  token: string;
  timestamp: string;
  action: 'APPROVED' | 'REJECTED';
  officer: string;
  note: string;
}

export interface CaseDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: OfficerCase | null;
  triggerElement?: HTMLElement | null;
  onRecordDecision?: (id: string, action: 'APPROVED' | 'REJECTED', note: string) => DecisionResultInfo;
  fetchDraftMemo?: (caseData: OfficerCase) => Promise<string>;
}

const reviewFixture = reviewFixtureRaw as unknown as VerificationResult;
const rejectedFixture = rejectedFixtureRaw as unknown as VerificationResult;
const approvedFixture = approvedFixtureRaw as unknown as VerificationResult;

export const CaseDetailDrawer: React.FC<CaseDetailDrawerProps> = ({
  isOpen,
  onClose,
  caseData,
  triggerElement,
  onRecordDecision,
  fetchDraftMemo
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Memo editing & Confirmation state
  const [memoText, setMemoText] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [recordedDecision, setRecordedDecision] = useState<DecisionResultInfo | null>(null);

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

  // Sync memo text when case changes or fetch draft
  useEffect(() => {
    if (!caseData) return;

    if (caseData.copilotDecisionNote) {
      setMemoText(caseData.copilotDecisionNote);
    } else if (fetchDraftMemo) {
      fetchDraftMemo(caseData).then((draft) => {
        setMemoText(draft);
      });
    }

    if (caseData.decisionToken && caseData.decisionTimestamp) {
      setRecordedDecision({
        token: caseData.decisionToken,
        timestamp: caseData.decisionTimestamp,
        action: caseData.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        officer: caseData.decisionOfficer || 'PRGI Verified Officer E-Token',
        note: caseData.copilotDecisionNote || ''
      });
    } else {
      setRecordedDecision(null);
    }

    setPendingConfirmation(null);
  }, [caseData, fetchDraftMemo]);

  // Handle ESC key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the close button on open
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
        if (pendingConfirmation) {
          setPendingConfirmation(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);

      if (triggerElement) {
        triggerElement.focus();
      }
    };
  }, [isOpen, onClose, triggerElement, pendingConfirmation]);

  // Decision Execution Handler
  const handleConfirmDecision = () => {
    if (!caseData || !pendingConfirmation) return;

    sound.playClick();
    if (pendingConfirmation === 'APPROVED') {
      sound.playSuccess();
    } else {
      sound.playAlert();
    }

    if (onRecordDecision) {
      const record = onRecordDecision(caseData.id, pendingConfirmation, memoText);
      setRecordedDecision(record);
    } else {
      // Fallback local state if handler not provided
      const seqStr = String(Math.floor(Math.random() * 900) + 100).padStart(5, '0');
      setRecordedDecision({
        token: `PRGI/2026/OFF/${seqStr}`,
        timestamp: new Date().toISOString(),
        action: pendingConfirmation,
        officer: 'PRGI Authorized Officer (Auth #DL-908)',
        note: memoText
      });
    }

    setPendingConfirmation(null);
  };

  const copyToken = () => {
    if (!recordedDecision) return;
    sound.playClick();
    navigator.clipboard.writeText(recordedDecision.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const copyDecisionMemo = () => {
    sound.playClick();
    navigator.clipboard.writeText(memoText);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  if (!isOpen || !caseData || !evidence) return null;

  const isDecided = Boolean(recordedDecision || caseData.status === 'APPROVED' || caseData.status === 'REJECTED');

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
                  Dossier Evidence &amp; Endorsement
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
          {/* 2. Recorded Decision Artifact Panel (Displayed after Action) */}
          {recordedDecision && (
            <div className={`p-6 rounded-2xl border ${
              recordedDecision.action === 'APPROVED' ? 'beige-card-success' : 'beige-card-danger'
            } space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-md`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E0D2] pb-3">
                <div className="flex items-center gap-2.5">
                  <Award className={`w-6 h-6 ${
                    recordedDecision.action === 'APPROVED' ? 'text-emerald-700' : 'text-rose-700'
                  }`} />
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75634B]">Official Recorded Decision Artifact</span>
                    <h3 className="text-base sm:text-lg font-bold font-editorial text-[#1C1917]">
                      {recordedDecision.action === 'APPROVED' ? 'Certificate of Title Verification Approved' : 'Statutory Title Rejection Order Issued'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    recordedDecision.action === 'APPROVED' 
                      ? 'bg-emerald-200 text-emerald-950 border-emerald-400 font-mono'
                      : 'bg-rose-200 text-rose-950 border-rose-400 font-mono'
                  }`}>
                    Status: {recordedDecision.action}
                  </span>
                </div>
              </div>

              {/* Reference Token and Timestamp Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-[#DDD1BF] flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-[10px] text-[#75634B] font-mono">Decision Reference Token</div>
                    <div className="font-mono font-extrabold text-sm text-[#1C1917] mt-0.5">
                      {recordedDecision.token}
                    </div>
                  </div>
                  <button
                    onClick={copyToken}
                    className="p-1.5 rounded bg-[#F8F6F0] hover:bg-[#EFE8DC] border border-[#DDD1BF] text-[#564735] hover:text-[#1C1917] cursor-pointer flex items-center gap-1 font-medium"
                    title="Copy token to clipboard"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="text-[10px]">{copiedToken ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#DDD1BF] shadow-sm">
                  <div className="text-[10px] text-[#75634B] font-mono">Recorded ISO 8601 Timestamp (UTC)</div>
                  <div className="font-mono font-bold text-xs text-[#1C1917] mt-0.5 truncate">
                    {recordedDecision.timestamp}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#564735] flex items-center gap-1.5 font-mono">
                <FileSignature className="w-3.5 h-3.5 text-emerald-700" />
                <span>Signed &amp; Sealed by PRGI Officer E-Token Authentication • Immutable Legal Record</span>
              </div>
            </div>
          )}

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

          {/* 4. AI Copilot Decision Memo (Always Editable with Draft status) */}
          <div className="beige-card rounded-2xl p-6 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E0D2] pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-sm text-[#1C1917]">
                    AI Copilot Decision Memorandum
                  </span>
                </div>
                <p className="text-[11px] text-[#75634B]">
                  Statutory Drafting Aid — Not an automated decision. Requires explicit officer endorsement to issue.
                </p>
              </div>

              {/* Explicit Draft Status Pill */}
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                  isDecided
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-mono'
                    : 'bg-amber-50 text-amber-900 border-dashed border-amber-400 font-mono'
                }`}>
                  {isDecided ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-700" />
                      <span>Officially Issued &amp; Signed</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                      <span>Draft — Not Yet Issued</span>
                    </>
                  )}
                </span>

                <button
                  onClick={copyDecisionMemo}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F8F6F0] text-[#564735] hover:text-[#1C1917] border border-[#DDD1BF] shadow-sm flex items-center gap-1 cursor-pointer font-semibold text-xs transition-colors"
                >
                  {copiedMemo ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedMemo ? 'Copied' : 'Copy Memo'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={7}
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="Officer decision memorandum, statutory findings, and citation notes..."
              className="w-full bg-white border border-[#DDD1BF] rounded-xl p-4 font-mono text-xs text-[#1C1917] focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 leading-relaxed shadow-sm"
            />
          </div>

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

        {/* Drawer Sticky Footer with 1. Two Distinct Actions & 3. Confirmation Step */}
        <div className="sticky bottom-0 z-20 bg-[#F0EBE0]/95 backdrop-blur-md px-6 py-4 border-t border-[#E5DDD0] space-y-3">
          {/* 3. In-Drawer Irreversible Confirmation Box */}
          {pendingConfirmation && (
            <div className={`p-4 rounded-xl border ${
              pendingConfirmation === 'APPROVED' ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
            } space-y-3 animate-in fade-in duration-200`}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  pendingConfirmation === 'APPROVED' ? 'text-emerald-700' : 'text-rose-700'
                }`} />
                <div className="text-xs">
                  <div className="font-bold text-[#1C1917] text-sm">
                    {pendingConfirmation === 'APPROVED' 
                      ? 'Confirm Legal Endorsement & Certificate Issuance?'
                      : 'Confirm Statutory Rejection Order?'}
                  </div>
                  <p className="text-[#564735] mt-1 leading-relaxed">
                    {pendingConfirmation === 'APPROVED'
                      ? `You are endorsing title "${caseData.proposedTitle}" for "${caseData.applicantName}". This legally commits the decision memorandum and issues an Official PRGI Decision Token.`
                      : `You are issuing a formal statutory rejection order for title "${caseData.proposedTitle}". This will record an official rejection memorandum.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={() => {
                    sound.playClick();
                    setPendingConfirmation(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#DDD1BF] text-[#564735] hover:bg-[#F8F6F0] cursor-pointer"
                >
                  Cancel / Return to Review
                </button>

                <button
                  onClick={handleConfirmDecision}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md cursor-pointer flex items-center gap-1.5 transition-all ${
                    pendingConfirmation === 'APPROVED'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {pendingConfirmation === 'APPROVED' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{pendingConfirmation === 'APPROVED' ? 'Confirm & Record Endorsement' : 'Confirm & Record Rejection'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Bar (When not in confirmation state) */}
          {!pendingConfirmation && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-[#75634B]">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>PRGI Officer E-Token Authenticated</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Action 1: Issue Rejection Order (Distinct Crimson Action) */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setPendingConfirmation('REJECTED');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border-2 border-rose-600 hover:border-rose-700 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <XCircle className="w-4 h-4 text-rose-700" />
                  <span>Issue Rejection Order</span>
                </button>

                {/* Action 2: Endorse & Approve (Distinct Forest Emerald Action) */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setPendingConfirmation('APPROVED');
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Endorse &amp; Approve</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
