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
  FilterX
} from 'lucide-react';
import { useRegistrySearch } from './useRegistrySearch';
import { sound } from '../../utils/audio';

const PAGE_SIZE = 50;

export const RegistryExplorer: React.FC = () => {
  const [rawSearchTerm, setRawSearchTerm] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedPeriodicity, setSelectedPeriodicity] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 2. Debounce search input by 300 ms
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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="border-b border-[#E8E0D2] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold mb-2">
            <Database className="w-3.5 h-3.5 text-amber-700" />
            <span>Layer 1 • Title Master Registry Explorer</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-editorial font-extrabold text-[#1C1917]">
            Title Master Registry Explorer
          </h1>
          <p className="text-sm text-[#564735] mt-1 max-w-3xl leading-relaxed">
            Query across national registered periodicals with 50-row pagination and debounced full-text indexing. Filter by state, language, or circulation frequency.
          </p>
        </div>

        {/* 4. Engine / Mode Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#DDD1BF] shadow-sm text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${mode === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-mono text-[#75634B]">Engine:</span>
              <span className="font-bold text-[#1C1917]">
                {mode === 'LIVE' ? 'LIVE (82,713 National Registry)' : 'OFFLINE (2,500 Sample Base)'}
              </span>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                refetch();
              }}
              title="Test / Reconnect live registry API"
              className="p-1.5 rounded-lg hover:bg-[#F8F6F0] text-[#75634B] hover:text-[#1C1917] border border-[#DDD1BF] cursor-pointer transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-700' : ''}`} />
            </button>
          </div>

          <div className="hidden sm:block p-3 rounded-xl bg-white border border-[#DDD1BF] text-center shadow-sm min-w-[130px]">
            <div className="text-[10px] text-[#75634B] font-mono font-semibold uppercase">Total Database</div>
            <div className="text-lg font-bold font-mono text-emerald-800">
              {mode === 'LIVE' ? '82,713' : '2,500'}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Filter Toolbar (Preserved Styling) */}
      <div className="beige-card rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Bar with 300ms Debounce */}
          <div className="relative">
            <label className="block text-[#564735] font-semibold mb-1">Search Keyword / Reg No</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A8A29E]" />
              <input
                type="text"
                value={rawSearchTerm}
                onChange={(e) => setRawSearchTerm(e.target.value)}
                placeholder="Type to search (e.g. 'Vidarbha', 'Jagran')..."
                className="w-full bg-white border border-[#DDD1BF] rounded-lg pl-8 pr-3 py-2.5 text-[#1C1917] placeholder-[#A8A29E] font-medium focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/10 shadow-sm"
              />
            </div>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Filter Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                sound.playClick();
                setSelectedLanguage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-2.5 text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
            >
              <option value="ALL">All Languages ({languages.length})</option>
              {languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Filter Jurisdiction / State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                sound.playClick();
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-2.5 text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
            >
              <option value="ALL">All States ({states.length})</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Periodicity Filter */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Filter Periodicity</label>
            <select
              value={selectedPeriodicity}
              onChange={(e) => {
                sound.playClick();
                setSelectedPeriodicity(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-2.5 text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
            >
              <option value="ALL">All Periodicities ({periodicities.length})</option>
              {periodicities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Results Status Bar */}
        <div 
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between text-xs text-[#564735] pt-2 border-t border-[#E8E0D2] gap-2"
        >
          <div className="flex items-center gap-2">
            <span>
              {total > 0 ? (
                <>
                  Showing <strong>{startRecord.toLocaleString()}–{endRecord.toLocaleString()}</strong> of{' '}
                  <strong>{total.toLocaleString()}</strong> matching titles
                </>
              ) : (
                '0 matching registered publications'
              )}
            </span>
            {debouncedQuery && (
              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded font-mono text-[11px] font-semibold border border-amber-300">
                Query: "{debouncedQuery}"
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {(debouncedQuery || selectedLanguage !== 'ALL' || selectedState !== 'ALL' || selectedPeriodicity !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                aria-label="Reset all search filters"
                className="text-xs font-semibold text-rose-800 hover:text-rose-950 flex items-center gap-1 cursor-pointer focus:ring-2 focus:ring-amber-700"
              >
                <FilterX className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset Filters</span>
              </button>
            )}
            <span className="font-mono font-semibold text-[#564735]">
              Page {currentPage} of {totalPages} (50 / page)
            </span>
          </div>
        </div>
      </div>

      {/* 5. Skeleton Loading State & 5. Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white border border-[#DDD1BF] flex flex-col justify-between space-y-3 shadow-sm animate-pulse min-h-[140px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-24 bg-[#EFE8DC] rounded" />
                  <div className="h-3 w-16 bg-[#EFE8DC] rounded" />
                </div>
                <div className="h-5 w-3/4 bg-[#EFE8DC] rounded mt-1" />
              </div>
              <div className="space-y-2 pt-2 border-t border-[#E8E0D2]">
                <div className="h-3 w-1/2 bg-[#EFE8DC] rounded" />
                <div className="h-3 w-2/3 bg-[#EFE8DC] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        /* 5. Empty State ("No titles match these filters") */
        <div className="beige-card rounded-2xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1C1917] font-editorial">
              No titles match these filters
            </h2>
            <p className="text-xs text-[#75634B] mt-1.5 leading-relaxed">
              No registered periodicals found matching your query or filter criteria in the national repository. Try broadening your terms or resetting filters.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1C1917] hover:bg-stone-800 text-white shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span>Reset all filters</span>
          </button>
        </div>
      ) : (
        /* Results Grid (50 rows paginated) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-white border border-[#DDD1BF] hover:border-[#CFC0A8] hover:shadow-md transition-all flex flex-col justify-between space-y-3 shadow-sm group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F8F6F0] text-amber-900 border border-amber-200">
                    {item.regNo || 'REG-PENDING'}
                  </span>
                  <span className="text-[10px] text-[#75634B] font-mono">
                    {item.regDate || 'Registered'}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-[#1C1917] leading-snug font-display group-hover:text-amber-900 transition-colors">
                  {item.title}
                </h2>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E8E0D2] text-[11px] text-[#75634B]">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-amber-700" />
                  <span>Language: {item.language || 'English'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-700" />
                  <span>State: {item.state || 'National'}</span>
                </div>
                {item.periodicity && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-purple-700" />
                    <span>Periodicity: {item.periodicity}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Pagination Controls (50 rows per page) */}
      {totalPages > 1 && (
        <nav 
          aria-label="Registry Pagination Navigation"
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E8E0D2]"
        >
          <div className="text-xs text-[#564735] font-mono">
            Showing page {currentPage} of {totalPages} ({total.toLocaleString()} total entries)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isLoading}
              aria-label="Previous Page"
              className="px-3.5 py-1.5 rounded-lg bg-white text-[#564735] hover:text-[#1C1917] disabled:opacity-40 text-xs font-semibold border border-[#DDD1BF] transition-colors cursor-pointer shadow-sm flex items-center gap-1 focus:ring-2 focus:ring-amber-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Previous</span>
            </button>

            <span 
              aria-current="page"
              className="text-xs font-mono text-[#1C1917] px-3 font-bold bg-white py-1.5 rounded-lg border border-[#DDD1BF] shadow-sm"
            >
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || isLoading}
              aria-label="Next Page"
              className="px-3.5 py-1.5 rounded-lg bg-white text-[#564735] hover:text-[#1C1917] disabled:opacity-40 text-xs font-semibold border border-[#DDD1BF] transition-colors cursor-pointer shadow-sm flex items-center gap-1 focus:ring-2 focus:ring-amber-700"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};
