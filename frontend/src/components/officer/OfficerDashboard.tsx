import React, { useState } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  ShieldAlert, 
  Edit3
} from 'lucide-react';
import type { OfficerCase } from '../../types';
import { sound } from '../../utils/audio';
import { ScrollReveal } from '../common/ScrollReveal';

export const OfficerDashboard: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'MANUAL_REVIEW' | 'REJECTED' | 'APPROVED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [cases, setCases] = useState<OfficerCase[]>([
    {
      id: 'CASE-2026-0811',
      applicantName: 'M/s Vidarbha Media Network LLP',
      proposedTitle: 'The Vidarbha Daily Express',
      language: 'Marathi, English',
      state: 'Maharashtra',
      periodicity: 'Daily',
      submissionDate: '15 Aug 2026',
      riskScore: 78,
      verdict: 'MANUAL_REVIEW',
      primaryConflict: 'Vidarbha Patrika (MAHMAR/2015/64294) — Shares primary core root token "Vidarbha"',
      status: 'UNDER_REVIEW',
      copilotDecisionNote: `OFFICIAL PRGI DECISION MEMORANDUM
Application ID: CASE-2026-0811
Proposed Title: "The Vidarbha Daily Express" (State: Maharashtra)

FINDING & CITATION:
Under PRGI Guidelines 2023, Clause 2.3(c) (Core Token Protection in Jurisdiction), the applicant's title shares the core root identifier "Vidarbha" with registered publication "Vidarbha Patrika" (MAHMAR/2015/64294). Adding generic prefixes like "The" and periodicity "Daily Express" is insufficient to prevent public deception.

RECOMMENDED DISPOSITION:
Recommend conditional rejection or request addition of a distinctive sub-district qualifier.`
    },
    {
      id: 'CASE-2026-0812',
      applicantName: 'Suresh Kumar Agrawal',
      proposedTitle: 'The Royal Matrimonial Classifieds',
      language: 'Hindi, English',
      state: 'Uttar Pradesh',
      periodicity: 'Weekly',
      submissionDate: '14 Aug 2026',
      riskScore: 92,
      verdict: 'REJECTED',
      primaryConflict: 'PRGI Rule 4.1a Commercial & Matrimonial Catalog Ban',
      status: 'REJECTED',
      copilotDecisionNote: `OFFICIAL PRGI DECISION MEMORANDUM
Application ID: CASE-2026-0812
Proposed Title: "The Royal Matrimonial Classifieds"

FINDING & CITATION:
The proposed title contains explicit commercial advertising catalogue terminology ("Matrimonial Classifieds"). This directly violates PRGI Title Verification Guidelines 2023, Section 4.1(a) prohibiting periodical registrations for dedicated commercial advertising or matrimonial listings.

RECOMMENDED DISPOSITION:
Summary rejection under Rule 4.1a.`
    },
    {
      id: 'CASE-2026-0813',
      applicantName: 'Ananya Roy & Associates',
      proposedTitle: 'Bengal Heritage & Policy Review',
      language: 'Bengali, English',
      state: 'West Bengal',
      periodicity: 'Monthly',
      submissionDate: '13 Aug 2026',
      riskScore: 12,
      verdict: 'APPROVED',
      primaryConflict: 'No registered conflicts found within state/language registry',
      status: 'APPROVED',
      copilotDecisionNote: `OFFICIAL PRGI DECISION MEMORANDUM
Application ID: CASE-2026-0813
Proposed Title: "Bengal Heritage & Policy Review"

FINDING & CITATION:
Title passes all 6 statutory rulebook checks under Press and Registration of Periodicals Act 2023. 4-D similarity score is 12% (well below the 45% threshold).

RECOMMENDED DISPOSITION:
Approved for issuance of Certificate of Title Verification.`
    }
  ]);

  const [selectedCase, setSelectedCase] = useState<OfficerCase>(cases[0]);
  const [editableNote, setEditableNote] = useState<string>(cases[0].copilotDecisionNote || '');

  const handleSelectCase = (c: OfficerCase) => {
    sound.playClick();
    setSelectedCase(c);
    setEditableNote(c.copilotDecisionNote || '');
  };

  const handleStatusUpdate = (newStatus: OfficerCase['status']) => {
    sound.playClick();
    const updated = cases.map((item) =>
      item.id === selectedCase.id
        ? { ...item, status: newStatus, copilotDecisionNote: editableNote }
        : item
    );
    setCases(updated);
    setSelectedCase({ ...selectedCase, status: newStatus, copilotDecisionNote: editableNote });
  };

  const copyDecisionNote = () => {
    sound.playClick();
    navigator.clipboard.writeText(editableNote);
    setCopiedId(selectedCase.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCases = cases.filter((c) => {
    if (filter === 'ALL') return true;
    return c.verdict === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* Chapter 01: Header */}
      <ScrollReveal className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#B45309]">
            01 / PRGI Officer Docket
          </span>
          <span className="h-px flex-1 bg-[#E8E0D2]" />
          <div className="flex items-center gap-1.5 text-xs text-[#78716C] font-mono">
            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Officer Authentication Active</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight text-[#1C1917]">
              Adjudication &amp; Decision Queue
            </h1>
            <p className="text-sm text-[#57534E] mt-2 max-w-2xl leading-relaxed">
              Risk-prioritized docket evaluating borderline amber collisions and statutory admissibility under the Press and Registration of Periodicals Act, 2023.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#78716C]">Filter Queue:</span>
            <div className="flex items-center gap-1">
              {(['ALL', 'MANUAL_REVIEW', 'REJECTED', 'APPROVED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    sound.playClick();
                    setFilter(f);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    filter === f
                      ? 'text-[#1C1917] font-bold border-b-2 border-[#1C1917]'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  {f === 'MANUAL_REVIEW' ? 'Amber Cases' : f === 'ALL' ? 'All Dossiers' : f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Chapter 02: Docket Two-Column Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Case Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E0D2] text-xs font-mono text-[#78716C]">
            <span className="font-bold text-[#1C1917] uppercase tracking-wider">
              Pending Docket ({filteredCases.length})
            </span>
            <span>Sorted by Risk Priority</span>
          </div>

          <div className="divide-y divide-[#E8E0D2]">
            {filteredCases.map((c) => {
              const isSelected = selectedCase.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCase(c)}
                  className={`py-4 px-3 -mx-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/70 border-l-4 border-amber-600 pl-4'
                      : 'hover:bg-stone-100/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-[#78716C]">
                      {c.id}
                    </span>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                      c.verdict === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      c.verdict === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {c.verdict === 'MANUAL_REVIEW' ? 'Amber Borderline' : c.verdict}
                    </span>
                  </div>

                  <h3 className="font-editorial text-lg font-bold text-[#1C1917] leading-snug">
                    {c.proposedTitle}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-[#78716C] mt-1">
                    <span className="truncate">{c.applicantName}</span>
                    <span>·</span>
                    <span>{c.state}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[#E8E0D2]/60">
                    <span className="truncate max-w-[200px] text-[#A8A29E] font-mono text-[11px]">
                      {c.primaryConflict}
                    </span>
                    <span className="font-mono font-bold text-amber-900 text-xs">
                      Risk {c.riskScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Case Dossier & Official Decision Note (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          <ScrollReveal className="space-y-6">
            {/* Dossier Header */}
            <div className="space-y-2 pb-4 border-b border-[#E8E0D2]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#B45309]">
                  Application Case File • {selectedCase.id}
                </span>
                <span className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full ${
                  selectedCase.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                  selectedCase.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  Status: {selectedCase.status}
                </span>
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">
                "{selectedCase.proposedTitle}"
              </h2>
            </div>

            {/* Structured Metadata Flow */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 text-xs border-b border-[#E8E0D2]">
              <div>
                <div className="text-[#A8A29E] font-mono text-[10px] uppercase">Applicant</div>
                <div className="font-semibold text-[#1C1917] mt-0.5 truncate">{selectedCase.applicantName}</div>
              </div>
              <div>
                <div className="text-[#A8A29E] font-mono text-[10px] uppercase">State / Jurisdiction</div>
                <div className="font-semibold text-[#1C1917] mt-0.5">{selectedCase.state}</div>
              </div>
              <div>
                <div className="text-[#A8A29E] font-mono text-[10px] uppercase">Language</div>
                <div className="font-semibold text-[#1C1917] mt-0.5">{selectedCase.language}</div>
              </div>
              <div>
                <div className="text-[#A8A29E] font-mono text-[10px] uppercase">Periodicity</div>
                <div className="font-semibold text-[#1C1917] mt-0.5">{selectedCase.periodicity}</div>
              </div>
            </div>

            {/* Conflict Evidence Note */}
            <div className="p-4 rounded-xl bg-[#F8F6F0] border-l-2 border-amber-600 space-y-1">
              <div className="text-xs font-mono font-bold text-amber-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                <span>Statutory Collision Evidence:</span>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed">
                {selectedCase.primaryConflict}
              </p>
            </div>

            {/* AI Copilot Decision Note Drafter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-[#1C1917]">
                  <Edit3 className="w-4 h-4 text-[#B45309]" />
                  <span>Official Decision Memorandum (Editable)</span>
                </div>
                <button
                  onClick={copyDecisionNote}
                  className="px-3 py-1 text-xs font-mono font-semibold text-[#78716C] hover:text-[#1C1917] hover:bg-[#EFEAE1] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === selectedCase.id ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === selectedCase.id ? 'Copied' : 'Copy Memo'}</span>
                </button>
              </div>

              <textarea
                rows={9}
                value={editableNote}
                onChange={(e) => setEditableNote(e.target.value)}
                className="w-full bg-[#FCFBF8] border border-[#E8E0D2] rounded-xl p-4 font-mono text-xs text-[#1C1917] focus:outline-none focus:border-stone-500 leading-relaxed shadow-inner"
              />
            </div>

            {/* Adjudication Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E8E0D2]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleStatusUpdate('APPROVED')}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#1C1917] hover:bg-[#292524] text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Endorse &amp; Approve</span>
                </button>

                <button
                  onClick={() => handleStatusUpdate('REJECTED')}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#E8E0D2] hover:bg-rose-50 text-rose-800 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Issue Rejection Order</span>
                </button>
              </div>

              <span className="text-xs text-[#A8A29E] font-mono">
                Cryptographically Signed via Officer E-Token
              </span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
};
