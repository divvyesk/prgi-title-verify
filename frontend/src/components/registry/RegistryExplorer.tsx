import React, { useState, useMemo } from 'react';
import { Database, Search, Globe, MapPin, Calendar } from 'lucide-react';
import sampleTitlesRaw from '../../data/titleMasterSample.json';
import type { TitleRecord } from '../../types';
import { sound } from '../../utils/audio';

const sampleTitles = sampleTitlesRaw as TitleRecord[];

export const RegistryExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedPeriodicity, setSelectedPeriodicity] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Extract unique filter choices
  const languages = useMemo(() => {
    const set = new Set<string>();
    sampleTitles.forEach((t) => t.language && set.add(t.language.split(',')[0].trim()));
    return Array.from(set).sort();
  }, []);

  const states = useMemo(() => {
    const set = new Set<string>();
    sampleTitles.forEach((t) => t.state && set.add(t.state.trim()));
    return Array.from(set).sort();
  }, []);

  const periodicities = useMemo(() => {
    const set = new Set<string>();
    sampleTitles.forEach((t) => t.periodicity && set.add(t.periodicity.trim()));
    return Array.from(set).sort();
  }, []);

  // Filtered list
  const filtered = useMemo(() => {
    return sampleTitles.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.regNo && item.regNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.registration_number && item.registration_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.publisher && item.publisher.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesLang =
        selectedLanguage === 'ALL' || (item.language && item.language.includes(selectedLanguage));

      const matchesState =
        selectedState === 'ALL' || item.state === selectedState;

      const matchesPeriodicity =
        selectedPeriodicity === 'ALL' || item.periodicity === selectedPeriodicity;

      return matchesSearch && matchesLang && matchesState && matchesPeriodicity;
    });
  }, [searchTerm, selectedLanguage, selectedState, selectedPeriodicity]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageChange = (p: number) => {
    sound.playClick();
    setCurrentPage(p);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="border-b border-[#E8E0D2] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold mb-2">
            <Database className="w-3.5 h-3.5 text-amber-700" />
            <span>Layer 1 • Registered Periodical Dataset</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-editorial font-extrabold text-[#1C1917]">
            Title Master Registry Explorer
          </h1>
          <p className="text-sm text-[#564735] mt-1 max-w-3xl leading-relaxed">
            Live database explorer indexed against real PRGI verified titles. Search registered publications, test queries, and filter by state, language, or periodicity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-[#DDD1BF] text-center shadow-sm">
            <div className="text-xs text-[#75634B] font-semibold">Sample Records</div>
            <div className="text-xl font-bold font-mono text-[#1C1917]">{sampleTitles.length.toLocaleString()}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-[#DDD1BF] text-center shadow-sm">
            <div className="text-xs text-[#75634B] font-semibold">National Master Base</div>
            <div className="text-xl font-bold font-mono text-emerald-700">160,000+</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="beige-card rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Bar */}
          <div className="relative">
            <label className="block text-[#564735] font-semibold mb-1">Search Keyword / Reg No</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A8A29E]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search titles (e.g. 'News', 'Patrika')..."
                className="w-full bg-white border border-[#DDD1BF] rounded-lg pl-8 pr-3 py-2.5 text-[#1C1917] placeholder-[#A8A29E] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
              />
            </div>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Filter Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-2.5 text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
            >
              <option value="ALL">All Languages</option>
              {languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-[#564735] font-semibold mb-1">Filter State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-2.5 text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
            >
              <option value="ALL">All States</option>
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
                setSelectedPeriodicity(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-[#DDD1BF] rounded-lg px-2.5 py-2.5 text-[#1C1917] font-medium focus:outline-none focus:border-amber-600 shadow-sm"
            >
              <option value="ALL">All Periodicities</option>
              {periodicities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#75634B] pt-2 border-t border-[#E8E0D2]">
          <span>Found <strong>{filtered.length}</strong> matching registered publications</span>
          <span className="font-mono font-semibold">Page {currentPage} of {totalPages}</span>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.map((item, idx) => {
          const regNumber = item.regNo || item.registration_number || 'REG-PENDING';
          const regDate = item.regDate || item.registration_date || 'Registered';
          const stateName = item.state || item.publication_state || 'National';
          const districtName = item.district || item.publication_district;

          return (
            <div
              key={item.id || item.title_id || `rec-${idx}`}
              className="p-4 rounded-xl bg-white border border-[#DDD1BF] hover:border-[#CFC0A8] transition-all flex flex-col justify-between space-y-3 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F8F6F0] text-amber-900 border border-amber-200">
                    {regNumber}
                  </span>
                  <span className="text-[10px] text-[#75634B] font-mono">
                    {regDate}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-[#1C1917] leading-snug font-display">
                  {item.title}
                </h2>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E8E0D2] text-[11px] text-[#75634B]">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-amber-700" />
                  <span>Language: {item.language || item.language_normalized || 'English'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-700" />
                  <span>State: {stateName} {districtName ? `(${districtName})` : ''}</span>
                </div>
                {item.periodicity && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-purple-700" />
                    <span>Periodicity: {item.periodicity}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3.5 py-1.5 rounded-lg bg-white text-[#564735] hover:text-[#1C1917] disabled:opacity-40 text-xs font-semibold border border-[#DDD1BF] transition-colors cursor-pointer shadow-sm"
          >
            Previous
          </button>

          <span className="text-xs font-mono text-[#75634B] px-3 font-semibold">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3.5 py-1.5 rounded-lg bg-white text-[#564735] hover:text-[#1C1917] disabled:opacity-40 text-xs font-semibold border border-[#DDD1BF] transition-colors cursor-pointer shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
