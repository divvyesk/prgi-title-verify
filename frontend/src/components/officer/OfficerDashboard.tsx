import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  Filter, 
  RotateCcw, 
  Layers, 
  AlertTriangle, 
  Flame, 
  Activity, 
  Globe, 
  MapPin, 
  Calendar, 
  X, 
  ExternalLink,
  ChevronRight,
  FileText
} from 'lucide-react';
import type { OfficerCase, VerdictStatus } from '../../types';
import { useCases } from './useCases';
import { CaseDetailDrawer } from './CaseDetailDrawer';
import { sound } from '../../utils/audio';
import { ScrollReveal } from '../common/ScrollReveal';

export const OfficerDashboard: React.FC = () => {
  const { 
    cases, 
    isLoading, 
    error, 
    source, 
    updateCaseNote, 
    recordDecision,
    fetchDraftMemo,
    reloadCases 
  } = useCases();

  // Filters state
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | VerdictStatus>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [languageFilter, setLanguageFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected case & Drawer state
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [editableNote, setEditableNote] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeTriggerElement, setActiveTriggerElement] = useState<HTMLElement | null>(null);

  // Extract unique filter dropdown values
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => c.state && set.add(c.state.trim()));
    return Array.from(set).sort();
  }, [cases]);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => c.language && set.add(c.language.trim()));
    return Array.from(set).sort();
  }, [cases]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => c.submissionDate && set.add(c.submissionDate.trim()));
    return Array.from(set).sort();
  }, [cases]);

  // Compute active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (verdictFilter !== 'ALL') count++;
    if (stateFilter !== 'ALL') count++;
    if (languageFilter !== 'ALL') count++;
    if (dateFilter !== 'ALL') count++;
    return count;
  }, [verdictFilter, stateFilter, languageFilter, dateFilter]);

  const handleClearAllFilters = () => {
    sound.playClick();
    setVerdictFilter('ALL');
    setStateFilter('ALL');
    setLanguageFilter('ALL');
    setDateFilter('ALL');
  };

  // Risk-First Ordering & Filtering
  const filteredAndSortedCases = useMemo(() => {
    const verdictPriority: Record<string, number> = {
      MANUAL_REVIEW: 1,
      REJECTED: 2,
      APPROVED: 3
    };

    return cases
      .filter((c) => {
        const matchesVerdict = verdictFilter === 'ALL' || c.verdict === verdictFilter;
        const matchesState = stateFilter === 'ALL' || c.state === stateFilter;
        const matchesLang = languageFilter === 'ALL' || c.language === languageFilter;
        const matchesDate = dateFilter === 'ALL' || c.submissionDate === dateFilter;
        return matchesVerdict && matchesState && matchesLang && matchesDate;
      })
      .sort((a, b) => {
        const priorityA = verdictPriority[a.verdict] ?? 99;
        const priorityB = verdictPriority[b.verdict] ?? 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return b.riskScore - a.riskScore;
      });
  }, [cases, verdictFilter, stateFilter, languageFilter, dateFilter]);

  // Sync selected case
  const selectedCase = useMemo(() => {
    if (!filteredAndSortedCases.length) return null;
    const found = filteredAndSortedCases.find((c) => c.id === selectedCaseId);
    return found || filteredAndSortedCases[0];
  }, [filteredAndSortedCases, selectedCaseId]);

  useEffect(() => {
    if (selectedCase) {
      setEditableNote(selectedCase.copilotDecisionNote || '');
      setSelectedCaseId((prevId) => (prevId !== selectedCase.id ? selectedCase.id : prevId));
    } else {
      setEditableNote('');
    }
  }, [selectedCase]);

  // Summary Metrics calculations
  const totalCasesCount = cases.length;
  const awaitingReviewCount = useMemo(() => {
    return cases.filter((c) => c.status === 'UNDER_REVIEW' || c.status === 'PENDING').length;
  }, [cases]);

  const amberCasesCount = useMemo(() => {
    return cases.filter((c) => c.verdict === 'MANUAL_REVIEW').length;
  }, [cases]);

  const medianRiskScore = useMemo(() => {
    if (!cases.length) return 0;
    const sorted = [...cases.map((c) => c.riskScore)].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }, [cases]);

  const handleSelectCase = (c: OfficerCase, triggerEl?: HTMLElement | null, openDrawer = true) => {
    sound.playClick();
    setSelectedCaseId(c.id);
    setEditableNote(c.copilotDecisionNote || '');
    if (triggerEl) {
      setActiveTriggerElement(triggerEl);
    }
    if (openDrawer) {
      setIsDrawerOpen(true);
    }
  };

  const handleNoteChange = (newNote: string) => {
    setEditableNote(newNote);
    if (selectedCase) {
      updateCaseNote(selectedCase.id, newNote);
    }
  };

  const copyDecisionNote = () => {
    if (!selectedCase) return;
    sound.playClick();
    navigator.clipboard.writeText(editableNote);
    setCopiedId(selectedCase.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* CHAPTER 01: Hero Header & Telemetry */}
      <ScrollReveal direction="up" delayMs={0}>
        <div className="border-b border-[#E8E0D2] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
              <UserCheck className="w-3.5 h-3.5 text-[#B45309]" />
              <span>01 / Statutory Adjudication Desk</span>
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-[#1C1917] tracking-tight">
              PRGI Officer Review Docket
            </h1>
            <p className="text-sm sm:text-base text-[#57534E] max-w-3xl leading-relaxed">
              Priority adjudication queue for Press Registrar General officers. High-risk and borderline manual review titles are ordered first to maximize statutory scrutiny where discretionary judgment is required.
            </p>
          </div>

          {/* Source Badge & Refresh Control */}
          <div className="flex items-center gap-3 shrink-0">
            <div 
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 border border-[#E2D7C5] shadow-sm text-xs"
              title={error ? `Note: ${error} (using fixture fallback)` : undefined}
            >
              <span 
                aria-hidden="true" 
                className={`w-2 h-2 rounded-full ${source === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
              />
              <span className="font-mono text-[#78716C]">Source:</span>
              <span className="font-bold text-[#1C1917]">{source === 'LIVE' ? 'Live API (8000)' : 'Fixture Data'}</span>
              {error && <span className="text-[10px] text-amber-800 font-mono">(Fallback)</span>}
            </div>
            <button
              onClick={() => {
                sound.playClick();
                reloadCases();
              }}
              aria-label="Reload case docket from data source"
              title="Reload cases from source"
              className="p-2.5 rounded-xl bg-white/80 hover:bg-[#F3EFE6] text-[#57534E] hover:text-[#1C1917] border border-[#E2D7C5] shadow-sm cursor-pointer transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-800' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* CHAPTER 02: Unboxed Executive Metrics */}
      <ScrollReveal direction="up" delayMs={60}>
        <section 
          role="region" 
          aria-label="Docket Summary Metrics" 
          aria-live="polite"
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 border-b border-[#E8E0D2] pb-8"
        >
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-[#78716C] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#B45309]" />
              <span>Total Docket</span>
            </div>
            <div className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">{totalCasesCount}</div>
            <div className="text-xs text-[#78716C]">Recorded verification applications</div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Awaiting Review</span>
            </div>
            <div className="font-editorial text-3xl sm:text-4xl font-bold text-amber-900">{awaitingReviewCount}</div>
            <div className="text-xs text-[#78716C]">Pending officer disposition</div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Borderline Amber</span>
            </div>
            <div className="font-editorial text-3xl sm:text-4xl font-bold text-rose-900">{amberCasesCount}</div>
            <div className="text-xs text-[#78716C]">High-touch discretionary cases</div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-[#78716C] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-700" />
              <span>Median Risk Score</span>
            </div>
            <div className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">{medianRiskScore}%</div>
            <div className="text-xs text-[#78716C]">Aggregate conflict threshold</div>
          </div>
        </section>
      </ScrollReveal>

      {/* CHAPTER 03: Floating Filter Stream */}
      <ScrollReveal direction="up" delayMs={100}>
        <div className="space-y-4 border-b border-[#E8E0D2] pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
              <Filter className="w-3.5 h-3.5 text-[#B45309]" />
              <span>02 / Queue Filter Parameters</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-mono font-bold">
                  {activeFilterCount} active
                </span>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset filters</span>
              </button>
            )}
          </div>

          {/* Filter Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Verdict Filter Chips */}
            <div className="space-y-1.5">
              <label className="block text-[#57534E] font-mono uppercase tracking-wider text-[11px]">Verdict Status</label>
              <div className="flex items-center gap-1 bg-[#EFEAE1]/60 p-1 rounded-xl">
                {(['ALL', 'MANUAL_REVIEW', 'REJECTED', 'APPROVED'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      sound.playClick();
                      setVerdictFilter(v);
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-medium text-[11px] transition-all cursor-pointer text-center ${
                      verdictFilter === v
                        ? 'bg-[#1C1917] text-white shadow-sm font-semibold'
                        : 'text-[#78716C] hover:text-[#1C1917] hover:bg-white/60'
                    }`}
                  >
                    {v === 'ALL' ? 'All' : v === 'MANUAL_REVIEW' ? 'Amber' : v === 'REJECTED' ? 'Reject' : 'Approve'}
                  </button>
                ))}
              </div>
            </div>

            {/* State Filter */}
            <div className="space-y-1.5">
              <label className="block text-[#57534E] font-mono uppercase tracking-wider text-[11px]">Jurisdiction / State</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A8A29E]" />
                <select
                  value={stateFilter}
                  onChange={(e) => {
                    sound.playClick();
                    setStateFilter(e.target.value);
                  }}
                  className="w-full bg-white/90 border border-[#E2D7C5] rounded-xl pl-8 pr-3 py-2 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#1C1917] transition-all"
                >
                  <option value="ALL">All States ({availableStates.length})</option>
                  {availableStates.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Filter */}
            <div className="space-y-1.5">
              <label className="block text-[#57534E] font-mono uppercase tracking-wider text-[11px]">Publication Language</label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A8A29E]" />
                <select
                  value={languageFilter}
                  onChange={(e) => {
                    sound.playClick();
                    setLanguageFilter(e.target.value);
                  }}
                  className="w-full bg-white/90 border border-[#E2D7C5] rounded-xl pl-8 pr-3 py-2 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#1C1917] transition-all"
                >
                  <option value="ALL">All Languages ({availableLanguages.length})</option>
                  {availableLanguages.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submission Date Filter */}
            <div className="space-y-1.5">
              <label className="block text-[#57534E] font-mono uppercase tracking-wider text-[11px]">Submission Date</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A8A29E]" />
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    sound.playClick();
                    setDateFilter(e.target.value);
                  }}
                  className="w-full bg-white/90 border border-[#E2D7C5] rounded-xl pl-8 pr-3 py-2 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#1C1917] transition-all"
                >
                  <option value="ALL">All Dates ({availableDates.length})</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#78716C] pt-1 font-mono">
            <span>Showing {filteredAndSortedCases.length} of {cases.length} cases</span>
            <span>Priority: Borderline Risk Score Descending</span>
          </div>
        </div>
      </ScrollReveal>

      {/* CHAPTER 04: Editorial Case Queue Stream */}
      <ScrollReveal direction="up" delayMs={140}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Seamless Prioritized Docket List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E0D2]">
              <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
                03 / Priority Cases ({filteredAndSortedCases.length})
              </h2>
              <span className="text-[11px] font-mono text-amber-800 font-medium">Click to inspect</span>
            </div>

            {filteredAndSortedCases.length === 0 ? (
              <div className="py-12 text-center text-[#78716C] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-amber-600 mx-auto" />
                <p className="font-editorial text-lg text-[#1C1917]">No cases match active filters</p>
                <p className="text-xs">Try adjusting your filters above to view other applications.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[720px] overflow-y-auto pr-1">
                {filteredAndSortedCases.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Case ${c.id}: ${c.proposedTitle}. Verdict: ${c.verdict}, Risk Score: ${c.riskScore} percent`}
                      onClick={(e) => handleSelectCase(c, e.currentTarget, false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectCase(c, e.currentTarget, false);
                        }
                      }}
                      className={`p-4 rounded-2xl transition-all cursor-pointer group border ${
                        isSelected
                          ? 'bg-amber-100/80 border-amber-300 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-amber-50/90 hover:border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-[#78716C]">
                            {c.id}
                          </span>
                          <span className="text-[11px] text-[#A8A29E] font-mono">
                            {c.submissionDate}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          c.verdict === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                          c.verdict === 'REJECTED' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                          'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {c.verdict.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="font-editorial text-xl font-bold text-[#1C1917] group-hover:text-amber-900 transition-colors">
                        {c.proposedTitle}
                      </h3>

                      <div className="text-xs text-[#78716C] mt-1 line-clamp-1">
                        {c.applicantName} • {c.state} ({c.language})
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#EFEAE1]/80 text-xs">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-[#78716C]">Risk Index:</span>
                          <span className={`font-bold ${
                            c.riskScore >= 70 ? 'text-rose-700' :
                            c.riskScore >= 40 ? 'text-amber-700' :
                            'text-emerald-700'
                          }`}>
                            {c.riskScore}%
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCase(c, e.currentTarget as HTMLElement, true);
                          }}
                          className="text-xs font-mono font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>Inspect Evidence</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Case Workspace & Decision Drafter */}
          <div className="lg:col-span-7 space-y-6 sticky top-6">
            {selectedCase ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E0D2]">
                  <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
                    04 / Case Adjudication Workspace
                  </h2>
                  <button
                    onClick={(e) => handleSelectCase(selectedCase, e.currentTarget, true)}
                    className="text-xs font-mono font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Open Evidence Drawer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Case Specimen Banner */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs text-[#78716C]">
                    <span>Application ID: {selectedCase.id}</span>
                    <span>•</span>
                    <span>{selectedCase.periodicity}</span>
                  </div>
                  <h3 className="font-editorial text-3xl sm:text-4xl font-bold text-[#1C1917]">
                    {selectedCase.proposedTitle}
                  </h3>
                  <p className="text-sm text-[#57534E]">
                    Submitted by <strong>{selectedCase.applicantName}</strong> in <strong>{selectedCase.state}</strong> ({selectedCase.language})
                  </p>
                </div>

                {/* Primary Conflict Summary */}
                {selectedCase.primaryConflict && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-1">
                    <div className="font-mono font-bold text-amber-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
                      <span>Identified Conflict Signal</span>
                    </div>
                    <p className="text-[#57534E] leading-relaxed">
                      {selectedCase.primaryConflict}
                    </p>
                  </div>
                )}

                {/* Decision Memorandum Drafter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#57534E]">
                      <FileText className="w-3.5 h-3.5 text-[#B45309]" />
                      <span>PRGI Official Decision Memorandum</span>
                    </div>
                    <button
                      onClick={copyDecisionNote}
                      className="text-xs font-mono font-semibold text-[#57534E] hover:text-[#1C1917] flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-white/80 border border-[#E2D7C5]"
                    >
                      {copiedId === selectedCase.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Memo</span>
                        </>
                      )}
                    </button>
                  </div>

                  <textarea
                    value={editableNote}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    rows={8}
                    className="w-full bg-white/90 border border-[#E2D7C5] rounded-2xl p-4 text-xs font-mono text-[#1C1917] focus:outline-none focus:border-[#1C1917] leading-relaxed transition-all shadow-inner"
                    placeholder="Draft decision reasoning, legal citations, and officer remarks..."
                  />
                </div>

                {/* Statutory Decision Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      sound.playSuccess();
                      recordDecision(selectedCase.id, 'APPROVED', editableNote);
                    }}
                    className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Grant Title Clearance</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      recordDecision(selectedCase.id, 'REJECTED', editableNote);
                    }}
                    className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Application</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-[#78716C] space-y-2">
                <UserCheck className="w-10 h-10 text-[#A8A29E] mx-auto" />
                <h3 className="font-editorial text-xl text-[#1C1917]">Select a case to adjudicate</h3>
                <p className="text-xs">Choose any application from the queue to view conflict findings and draft official remarks.</p>
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* Case Detail Evidence Drawer */}
      {selectedCase && (
        <CaseDetailDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            if (activeTriggerElement) {
              activeTriggerElement.focus();
            }
          }}
          caseData={selectedCase}
          triggerElement={activeTriggerElement}
          onRecordDecision={(id, action, note) => {
            const res = recordDecision(id, action, note);
            setIsDrawerOpen(false);
            return res;
          }}
          fetchDraftMemo={fetchDraftMemo}
        />
      )}
    </div>
  );
};
