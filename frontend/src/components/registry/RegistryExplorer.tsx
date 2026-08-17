import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Globe, 
  MapPin, 
  Calendar, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  FilterX,
  FileCheck,
  Building2
} from 'lucide-react';
import { useRegistrySearch } from './useRegistrySearch';
import { sound } from '../../utils/audio';
import { ScrollReveal } from '../common/ScrollReveal';

const PAGE_SIZE = 50;

export const RegistryExplorer: React.FC = () => {
  const [rawSearchTerm, setRawSearchTerm] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedPeriodicity, setSelectedPeriodicity] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Debounce search input by 300 ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(rawSearchTerm);
      setCurrentPage(1);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [rawSearchTerm]);

  // Use live/offline search hook
  const {
    records,
    total,
    totalPages,
    isLoading,
    mode,
    languages,
    states,
    periodicities,
    refetch
  } = useRegistrySearch({
    query: debouncedQuery,
    state: selectedState,
    language: selectedLanguage,
    periodicity: selectedPeriodicity,
    page: currentPage,
    size: PAGE_SIZE
  });

  const handlePageChange = (p: number) => {
    sound.playClick();
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    sound.playClick();
    setRawSearchTerm('');
    setDebouncedQuery('');
    setSelectedLanguage('ALL');
    setSelectedState('ALL');
    setSelectedPeriodicity('ALL');
    setCurrentPage(1);
  };

  const startRecord = (currentPage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* CHAPTER 01: Hero Header & Database Metrics */}
      <ScrollReveal direction="up" delayMs={0}>
        <div className="border-b border-[#E8E0D2] pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
              <Database className="w-3.5 h-3.5 text-[#B45309]" />
              <span>01 / National Title Master Registry</span>
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-bold text-[#1C1917] tracking-tight">
              Title Master Registry Explorer
            </h1>
            <p className="text-sm sm:text-base text-[#57534E] max-w-3xl leading-relaxed">
              Explore national registered periodical titles across Indian states and languages. Query 82,713 titles with full-text indexing, phonetics, and exact statutory metadata verification.
            </p>
          </div>

          {/* Engine & Database Metric Indicators */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/80 border border-[#E2D7C5] shadow-sm text-xs">
              <span className={`w-2 h-2 rounded-full ${mode === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-mono text-[#78716C]">Engine:</span>
              <span className="font-bold text-[#1C1917]">
                {mode === 'LIVE' ? 'LIVE (82,713 Registry)' : 'OFFLINE (2,500 Sample)'}
              </span>
              <button
                onClick={() => {
                  sound.playClick();
                  refetch();
                }}
                title="Refresh database connection"
                className="ml-1 p-1 rounded hover:bg-[#F3EFE6] text-[#78716C] hover:text-[#1C1917] cursor-pointer transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-800' : ''}`} />
              </button>
            </div>

            <div className="space-y-0.5 text-right hidden sm:block">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#78716C]">Total Titles</div>
              <div className="font-editorial text-2xl font-bold text-[#1C1917]">
                {mode === 'LIVE' ? '82,713' : '2,500'}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* CHAPTER 02: Cardless Search & Multi-Param Filtering */}
      <ScrollReveal direction="up" delayMs={60}>
        <div className="space-y-4 border-b border-[#E8E0D2] pb-8">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
              02 / Query &amp; Jurisdiction Filters
            </div>
            {(debouncedQuery || selectedLanguage !== 'ALL' || selectedState !== 'ALL' || selectedPeriodicity !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Reset filters</span>
              </button>
            )}
          </div>

          {/* Search Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Search Input */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label className="block text-[#57534E] font-mono uppercase tracking-wider text-[11px]">
                Search Keyword or Reg No
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#A8A29E]" />
                <input
                  type="text"
                  value={rawSearchTerm}
                  onChange={(e) => setRawSearchTerm(e.target.value)}
                  placeholder="Type title (e.g. 'Vidarbha', 'Jagran')..."
                  className="w-full bg-white/90 border border-[#E2D7C5] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#1C1917] placeholder-[#A8A29E] font-medium focus:outline-none focus:border-[#1C1917] transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Language Filter */}
            <div className="space-y-1.5">
              <label className="block text-[#57534E] font-mono uppercase tracking-wider text-[11px]">
                Publication Language
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#A8A29E]" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    sound.playClick();
                    setSelectedLanguage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white/90 border border-[#E2D7C5] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#1C1917] transition-all shadow-sm"
                >
                  <option value="ALL">All Languages ({languages.length})</option>
                  {languages.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* State Filter */}
            <div className="space-y-1.5">
              <label className="block text-[#57534E] font-mono uppercase tracking-wider text-[11px]">
                State Jurisdiction
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#A8A29E]" />
                <select
                  value={selectedState}
                  onChange={(e) => {
                    sound.playClick();
                    setSelectedState(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white/90 border border-[#E2D7C5] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#1C1917] transition-all shadow-sm"
                >
                  <option value="ALL">All States ({states.length})</option>
                  {states.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Periodicity Filter */}
            <div className="space-y-1.5">
              <label className="block text-[#57534E] font-mono uppercase tracking-wider text-[11px]">
                Circulation Periodicity
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3.5 top-3 text-[#A8A29E]" />
                <select
                  value={selectedPeriodicity}
                  onChange={(e) => {
                    sound.playClick();
                    setSelectedPeriodicity(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white/90 border border-[#E2D7C5] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1C1917] font-medium focus:outline-none focus:border-[#1C1917] transition-all shadow-sm"
                >
                  <option value="ALL">All Periodicities ({periodicities.length})</option>
                  {periodicities.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Status Bar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-[#78716C] pt-2 font-mono gap-2">
            <div>
              {total > 0 ? (
                <>
                  Showing <strong>{startRecord.toLocaleString()}–{endRecord.toLocaleString()}</strong> of{' '}
                  <strong>{total.toLocaleString()}</strong> verified titles
                </>
              ) : (
                '0 matching registered publications'
              )}
              {debouncedQuery && (
                <span className="ml-2 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-mono font-semibold">
                  "{debouncedQuery}"
                </span>
              )}
            </div>
            <div>
              Page {currentPage} of {totalPages} (50 / page)
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* CHAPTER 03: Seamless Cardless Title Stream */}
      <ScrollReveal direction="up" delayMs={100}>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E0D2]">
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">
              03 / Registered Publications Stream
            </h2>
            <span className="text-xs font-mono text-[#78716C]">50 Rows Per Page</span>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white/40 border border-[#EFEAE1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-[#E2D7C5]/60 rounded-md w-1/3" />
                    <div className="h-3 bg-[#E2D7C5]/40 rounded-md w-1/2" />
                  </div>
                  <div className="h-4 bg-[#E2D7C5]/40 rounded-md w-24" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 text-center text-[#78716C] space-y-3">
              <Database className="w-10 h-10 text-[#A8A29E] mx-auto" />
              <h3 className="font-editorial text-2xl text-[#1C1917]">No registered titles found</h3>
              <p className="text-sm max-w-md mx-auto">
                No publications match your current query or filters. Try searching with a different term or clearing filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-white border border-[#E2D7C5] text-xs font-semibold text-[#1C1917] hover:bg-[#F3EFE6] cursor-pointer transition-colors"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#EFEAE1]/90">
              {records.map((r, idx) => (
                <div
                  key={r.title_id || r.registration_number || idx}
                  className="py-4 sm:py-5 px-3 sm:px-4 rounded-2xl transition-all hover:bg-amber-50/90 border border-transparent hover:border-amber-200 group flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Title & Metadata */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] font-bold text-[#B45309] bg-amber-100/70 px-2 py-0.5 rounded-md">
                        {r.registration_number || `ID-${r.title_id}`}
                      </span>
                      {r.periodicity && (
                        <span className="font-mono text-[11px] text-[#78716C] bg-[#EFEAE1]/70 px-2 py-0.5 rounded-md">
                          {r.periodicity}
                        </span>
                      )}
                      {r.registration_date && (
                        <span className="font-mono text-[11px] text-[#A8A29E]">
                          Registered: {r.registration_date}
                        </span>
                      )}
                    </div>

                    <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1C1917] group-hover:text-amber-950 transition-colors truncate">
                      {r.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#57534E] pt-0.5">
                      {r.owner && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-[#A8A29E]" />
                          <span>{r.owner}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#A8A29E]" />
                        <span>{r.publication_state || 'All India'}{r.publication_district ? `, ${r.publication_district}` : ''}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-[#A8A29E]" />
                        <span>{r.language}</span>
                      </span>
                    </div>
                  </div>

                  {/* Core Stem & Token Badge */}
                  <div className="shrink-0 flex md:flex-col items-end justify-between gap-2 text-right">
                    {r.title_core && (
                      <div className="text-[11px] font-mono text-[#78716C]">
                        Core Root: <strong className="text-[#1C1917]">{r.title_core}</strong>
                      </div>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <FileCheck className="w-3 h-3" />
                      <span>PRGI Verified</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Minimalist Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E8E0D2]">
              <div className="text-xs font-mono text-[#78716C]">
                Showing {startRecord.toLocaleString()}–{endRecord.toLocaleString()} of {total.toLocaleString()} titles
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                  className="px-3 py-1.5 rounded-xl border border-[#E2D7C5] bg-white/80 hover:bg-[#F3EFE6] text-xs font-medium text-[#1C1917] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="px-3 py-1.5 text-xs font-mono font-semibold text-[#1C1917]">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading}
                  className="px-3 py-1.5 rounded-xl border border-[#E2D7C5] bg-white/80 hover:bg-[#F3EFE6] text-xs font-medium text-[#1C1917] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
};
