import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  Filter, 
  ShieldAlert, 
  Edit3,
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
  ChevronRight
} from 'lucide-react';
import type { OfficerCase, VerdictStatus } from '../../types';
import { useCases } from './useCases';
import { CaseDetailDrawer } from './CaseDetailDrawer';
import { sound } from '../../utils/audio';

export const OfficerDashboard: React.FC = () => {
  const { cases, isLoading, error, source, updateCaseStatus, updateCaseNote, reloadCases } = useCases();

  // Filters state
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | VerdictStatus>('ALL');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [languageFilter, setLanguageFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected case & Drawer state
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [editableNote, setEditableNote] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true); // Initialized open on first amber case
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

  // 1. Risk-First Ordering & Filtering
  // Priority: MANUAL_REVIEW (Amber) desc by riskScore -> REJECTED desc by riskScore -> APPROVED desc by riskScore
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

  const handleStatusUpdate = (newStatus: OfficerCase['status']) => {
    if (!selectedCase) return;
    sound.playClick();
    updateCaseStatus(selectedCase.id, newStatus, editableNote);
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="border-b border-[#E8E0D2] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold mb-2">
            <UserCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>Member 6 • Officer Review Docket &amp; Decision Drafter</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-editorial font-extrabold text-[#1C1917]">
            PRGI Officer Review Docket
          </h1>
          <p className="text-xs sm:text-sm text-amber-900 font-semibold mt-1 max-w-3xl leading-relaxed bg-amber-50/80 px-3 py-1.5 rounded-lg border border-amber-200">
            Priority Docket Queue: Borderline Manual Review (Amber) cases are prioritized at the top by descending risk score to focus officer scrutiny where human discretion is most critical.
          </p>
        </div>

        {/* Source Badge & Refresh Control */}
        <div className="flex items-center gap-2">
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#DDD1BF] shadow-sm text-xs"
            title={error ? `Note: ${error} (using fixture fallback)` : undefined}
          >
            <span className={`w-2 h-2 rounded-full ${source === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="font-mono text-[#75634B]">Source:</span>
            <span className="font-bold text-[#1C1917]">{source === 'LIVE' ? 'Live API' : 'Fixture Data'}</span>
            {error && <span className="text-[10px] text-amber-700 font-mono">(Fallback)</span>}
          </div>
          <button
            onClick={() => {
              sound.playClick();
              reloadCases();
            }}
            title="Reload cases from source"
            className="p-2 rounded-xl bg-white hover:bg-[#F8F6F0] text-[#75634B] hover:text-[#1C1917] border border-[#DDD1BF] shadow-sm cursor-pointer transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-700' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Summary Strip at the Top */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#DDD1BF] shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#75634B] uppercase tracking-wider font-mono">Total Docket</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#1C1917]">{totalCasesCount} Cases</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#DDD1BF] shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#75634B] uppercase tracking-wider font-mono">Awaiting Review</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-800">{awaitingReviewCount} Pending</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#DDD1BF] shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
            <Flame className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#75634B] uppercase tracking-wider font-mono">Borderline Amber</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700">{amberCasesCount} High-Touch</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#DDD1BF] shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
            <Activity className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#75634B] uppercase tracking-wider font-mono">Median Risk Score</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-900">{medianRiskScore}%</div>
          </div>
        </div>
      </div>

      {/* 2. Comprehensive Filter Toolbar */}
      <div className="beige-card rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E0D2] pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917]">
            <Filter className="w-4 h-4 text-amber-700" />
            <span>Filter Docket Queue</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-mono font-extrabold">
                {activeFilterCount} active
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear all filters</span>
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Verdict Filter Chips */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Verdict Status</label>
            <div className="flex items-center gap-1">
              {(['ALL', 'MANUAL_REVIEW', 'REJECTED', 'APPROVED'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    sound.playClick();
                    setVerdictFilter(v);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer text-center ${
                    verdictFilter === v
                      ? 'bg-[#1C1917] text-white shadow-sm'
                      : 'bg-white hover:bg-[#F0EBE0] text-[#75634B] border border-[#DDD1BF]'
                  }`}
                >
                  {v === 'ALL' ? 'All' : v === 'MANUAL_REVIEW' ? 'Amber' : v === 'REJECTED' ? 'Reject' : 'Approve'}
                </button>
              ))}
            </div>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Jurisdiction / State</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#A8A29E]" />
              <select
                value={stateFilter}
                onChange={(e) => {
                  sound.playClick();
                  setStateFilter(e.target.value);
                }}
                className="w-full bg-white border border-[#DDD1BF] rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
              >
                <option value="ALL">All States ({availableStates.length})</option>
                {availableStates.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Publication Language</label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#A8A29E]" />
              <select
                value={languageFilter}
                onChange={(e) => {
                  sound.playClick();
                  setLanguageFilter(e.target.value);
                }}
                className="w-full bg-white border border-[#DDD1BF] rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
              >
                <option value="ALL">All Languages ({availableLanguages.length})</option>
                {availableLanguages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submission Date Filter */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Submission Date</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#A8A29E]" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  sound.playClick();
                  setDateFilter(e.target.value);
                }}
                className="w-full bg-white border border-[#DDD1BF] rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
              >
                <option value="ALL">All Dates ({availableDates.length})</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#75634B] pt-1">
          <span>Showing <strong>{filteredAndSortedCases.length}</strong> of {cases.length} cases matching filters</span>
          <span className="font-mono text-[11px]">Ranked by Borderline Risk Priority</span>
        </div>
      </div>

      {/* Case Queue & Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Queue List */}
        <div className="lg:col-span-5 beige-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
            <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span>Prioritized Queue ({filteredAndSortedCases.length})</span>
            </div>
            <span className="text-[11px] text-[#75634B] font-mono">Amber First</span>
          </div>

          {filteredAndSortedCases.length === 0 ? (
            <div className="p-8 text-center text-[#75634B] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="font-bold text-[#1C1917]">No cases match active filters</p>
              <p className="text-xs text-[#75634B]">Try adjusting or clearing the filter chips above.</p>
              <button
                onClick={handleClearAllFilters}
                className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-[#DDD1BF] text-xs font-semibold text-[#1C1917] hover:bg-[#F8F6F0] cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {filteredAndSortedCases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleSelectCase(c, e.currentTarget, true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectCase(c, e.currentTarget, true);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-amber-600 ${
                      isSelected
                        ? 'bg-amber-50/90 border-amber-500 shadow-md ring-1 ring-amber-400/40'
                        : 'bg-white border-[#DDD1BF] hover:border-[#CFC0A8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[#75634B]">
                          {c.id}
                        </span>
                        <span className="text-[10px] text-[#75634B] font-mono">
                          {c.submissionDate}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        c.verdict === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                        c.verdict === 'REJECTED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                        'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {c.verdict === 'MANUAL_REVIEW' ? 'Borderline Amber' : c.verdict}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#1C1917] text-sm mb-1 font-display group-hover:text-amber-900 transition-colors">
                        {c.proposedTitle}
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#A8A29E] group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5" />
                    </div>

                    <div className="text-[11px] text-[#75634B] flex items-center gap-2">
                      <span>{c.applicantName}</span>
                      <span>•</span>
                      <span>{c.state}</span>
                      <span>•</span>
                      <span>{c.language}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#F0EBE0] text-[11px] text-[#564735] flex items-center justify-between">
                      <span className="truncate max-w-[200px] text-[#75634B] font-medium">{c.primaryConflict || 'No registered conflict'}</span>
                      <span className={`font-mono font-bold ${
                        c.riskScore >= 75 ? 'text-rose-700' :
                        c.riskScore >= 45 ? 'text-amber-800' : 'text-emerald-700'
                      }`}>
                        Risk: {c.riskScore}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Case File & Copilot Decision Drafter */}
        <div className="lg:col-span-7 beige-card rounded-2xl p-6 sm:p-8 space-y-6">
          {selectedCase ? (
            <>
              <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
                <div>
                  <div className="text-xs font-mono text-[#75634B] font-bold flex items-center gap-2">
                    <span>{selectedCase.id}</span>
                    <span>•</span>
                    <span>Submitted: {selectedCase.submissionDate}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#1C1917] mt-0.5">
                    "{selectedCase.proposedTitle}"
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    selectedCase.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                    selectedCase.status === 'REJECTED' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                    'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    Current: {selectedCase.status}
                  </span>
                </div>
              </div>

              {/* Details Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-white border border-[#DDD1BF] shadow-sm">
                  <div className="text-[#75634B] text-[10px] font-semibold">Applicant</div>
                  <div className="font-bold text-[#1C1917] truncate">{selectedCase.applicantName}</div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#DDD1BF] shadow-sm">
                  <div className="text-[#75634B] text-[10px] font-semibold">Jurisdiction</div>
                  <div className="font-bold text-[#1C1917] truncate">{selectedCase.state}</div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#DDD1BF] shadow-sm">
                  <div className="text-[#75634B] text-[10px] font-semibold">Language</div>
                  <div className="font-bold text-[#1C1917] truncate">{selectedCase.language}</div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-[#DDD1BF] shadow-sm">
                  <div className="text-[#75634B] text-[10px] font-semibold">Periodicity</div>
                  <div className="font-bold text-[#1C1917] truncate">{selectedCase.periodicity}</div>
                </div>
              </div>

              {/* Primary Conflict Evidence & Quick Trigger */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-900 flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                    <span>Conflict Flag Evidence:</span>
                  </div>
                  <span className="font-bold text-amber-800">Assessed Risk: {selectedCase.riskScore}%</span>
                </div>
                <p className="text-xs text-[#564735] leading-relaxed font-sans">
                  {selectedCase.primaryConflict || 'No severe statutory clash detected in national database.'}
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      sound.playClick();
                      setActiveTriggerElement(e.currentTarget);
                      setIsDrawerOpen(true);
                    }}
                    className="text-xs font-bold text-amber-900 hover:text-[#1C1917] flex items-center gap-1 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-sm hover:bg-amber-100 transition-colors focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  >
                    <span>View Complete 4D Evidence Dossier</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* AI Copilot Decision Note Drafter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1C1917] flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>AI Copilot Official Decision Note (Editable)</span>
                  </span>
                  <button
                    onClick={copyDecisionNote}
                    className="px-2.5 py-1 rounded bg-white hover:bg-[#F8F6F0] text-[#564735] hover:text-[#1C1917] border border-[#DDD1BF] flex items-center gap-1 cursor-pointer font-semibold shadow-sm"
                  >
                    {copiedId === selectedCase.id ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === selectedCase.id ? 'Copied' : 'Copy Memo'}</span>
                  </button>
                </div>

                <textarea
                  rows={7}
                  value={editableNote}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Officer decision notes and statutory findings..."
                  className="w-full bg-white border border-[#DDD1BF] rounded-xl p-3.5 font-mono text-xs text-[#1C1917] focus:outline-none focus:border-amber-600 leading-relaxed shadow-sm"
                />
              </div>

              {/* Officer Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E8E0D2]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusUpdate('APPROVED')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Endorse &amp; Approve</span>
                  </button>

                  <button
                    onClick={() => handleStatusUpdate('REJECTED')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Issue Rejection Order</span>
                  </button>
                </div>

                <span className="text-[11px] text-[#948063] font-mono">
                  Signed via PRGI Officer E-Token
                </span>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-[#75634B]">
              <p className="font-bold text-[#1C1917]">No case selected</p>
              <p className="text-xs text-[#75634B] mt-1">Select a case from the queue to view dossier details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Case Evidence Detail Drawer */}
      <CaseDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        caseData={selectedCase}
        triggerElement={activeTriggerElement}
      />
    </div>
  );
};
