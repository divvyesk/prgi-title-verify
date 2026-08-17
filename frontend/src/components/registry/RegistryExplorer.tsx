import React, { useState, useMemo } from 'react';
import { Database, Search, Globe, MapPin, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import sampleTitlesRaw from '../../data/titleMasterSample.json';
import type { TitleRecord } from '../../types';
import { sound } from '../../utils/audio';
import { ScrollReveal } from '../common/ScrollReveal';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* Chapter 01: Header */}
      <ScrollReveal className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#B45309]">
            01 / Master Registry Explorer
          </span>
          <span className="h-px flex-1 bg-[#E8E0D2]" />
          <div className="flex items-center gap-1.5 text-xs text-[#78716C] font-mono">
            <Database className="w-3.5 h-3.5 text-emerald-700" />
            <span>82,713 PostgreSQL Indexed Records</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight text-[#1C1917]">
              National Periodical Registry
            </h1>
            <p className="text-sm text-[#57534E] mt-2 max-w-2xl leading-relaxed">
              Real-time directory of verified press and periodical titles registered across Indian states and Union Territories under the PRGI Act.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-[#A8A29E] block uppercase text-[10px]">Sample Browser</span>
              <span className="font-bold text-[#1C1917] text-lg font-display">{sampleTitles.length.toLocaleString()}</span>
            </div>
            <div className="h-8 w-px bg-[#E8E0D2]" />
            <div>
              <span className="text-[#A8A29E] block uppercase text-[10px]">National Master Base</span>
              <span className="font-bold text-emerald-700 text-lg font-display">82,713</span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Chapter 02: Filter Stream */}
      <ScrollReveal className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#78716C]">
            02 / Filter &amp; Search Matrix
          </span>
          <span className="h-px flex-1 bg-[#E8E0D2]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Search Keyword */}
          <div className="space-y-1.5">
            <label className="block text-[#57534E] font-medium">Search Keyword / Reg No</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#A8A29E]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search (e.g. 'News', 'Patrika')..."
                className="w-full bg-[#FCFBF8] border border-[#E8E0D2] rounded-xl pl-9 pr-3 py-2.5 text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-stone-500 transition-colors"
              />
            </div>
          </div>

          {/* Language Filter */}
          <div className="space-y-1.5">
            <label className="block text-[#57534E] font-medium">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FCFBF8] border border-[#E8E0D2] rounded-xl px-3 py-2.5 text-[#1C1917] focus:outline-none focus:border-stone-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Languages</option>
              {languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className="space-y-1.5">
            <label className="block text-[#57534E] font-medium">State / UT</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FCFBF8] border border-[#E8E0D2] rounded-xl px-3 py-2.5 text-[#1C1917] focus:outline-none focus:border-stone-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All States / UTs</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Periodicity Filter */}
          <div className="space-y-1.5">
            <label className="block text-[#57534E] font-medium">Periodicity</label>
            <select
              value={selectedPeriodicity}
              onChange={(e) => {
                setSelectedPeriodicity(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#FCFBF8] border border-[#E8E0D2] rounded-xl px-3 py-2.5 text-[#1C1917] focus:outline-none focus:border-stone-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Periodicities</option>
              {periodicities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[#78716C] pt-2 border-t border-[#E8E0D2]">
          <span>Displaying <strong>{filtered.length}</strong> matching verified titles</span>
          <span className="font-mono font-semibold">Page {currentPage} of {totalPages}</span>
        </div>
      </ScrollReveal>

      {/* Chapter 03: Results Linear Grid */}
      <ScrollReveal className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((item, idx) => {
            const regNumber = item.regNo || item.registration_number || 'REG-PENDING';
            const regDate = item.regDate || item.registration_date || 'Registered';
            const stateName = item.state || item.publication_state || 'National';
            const districtName = item.district || item.publication_district;

            return (
              <div
                key={item.id || item.title_id || `rec-${idx}`}
                className="p-5 rounded-2xl bg-white/60 border border-[#E8E0D2] hover:bg-amber-50/80 hover:border-amber-300/80 hover:shadow-sm transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-[#B45309] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100/60 border border-amber-200/80">
                      {regNumber}
                    </span>
                    <span className="text-[10px] text-[#A8A29E] font-mono">
                      {regDate}
                    </span>
                  </div>

                  <h3 className="font-editorial text-xl font-bold text-[#1C1917] leading-snug">
                    {item.title}
                  </h3>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-[#E8E0D2] text-xs text-[#78716C]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-stone-400" />
                    <span>Language: <strong className="text-[#1C1917] font-medium">{item.language || item.language_normalized || 'English'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>State: <strong className="text-[#1C1917] font-medium">{stateName} {districtName ? `(${districtName})` : ''}</strong></span>
                  </div>
                  {item.periodicity && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>Periodicity: <strong className="text-[#1C1917] font-medium">{item.periodicity}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-8 border-t border-[#E8E0D2]">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#1C1917] hover:bg-[#EFEAE1] disabled:opacity-30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-mono text-[#78716C] px-3">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#1C1917] hover:bg-[#EFEAE1] disabled:opacity-30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </ScrollReveal>
    </div>
  );
};
