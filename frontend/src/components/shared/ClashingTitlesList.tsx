import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { ClashingTitle } from '../../types';

export interface ClashingTitlesListProps {
  clashingTitles: ClashingTitle[];
  className?: string;
  maxItems?: number;
  badgeLabel?: string;
}

export const ClashingTitlesList: React.FC<ClashingTitlesListProps> = ({
  clashingTitles,
  className = '',
  maxItems = 5,
  badgeLabel = '160k Registry'
}) => {
  const displayedClashes = maxItems ? clashingTitles.slice(0, maxItems) : clashingTitles;

  return (
    <section 
      role="region" 
      aria-label="Top Clashing Registered Publications"
      className={`beige-card rounded-2xl p-6 space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
        <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-rose-700" aria-hidden="true" />
          <span>Top Clashing Registered Titles ({displayedClashes.length} {clashingTitles.length > displayedClashes.length ? `of ${clashingTitles.length}` : ''} Suspects)</span>
        </div>
        <span className="text-[11px] text-[#564735] font-mono">{badgeLabel}</span>
      </div>

      {clashingTitles.length === 0 ? (
        <div className="p-8 text-center text-[#564735] space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" aria-hidden="true" />
          <p className="font-bold text-[#1C1917]">No Clashing Registered Titles</p>
          <p className="text-xs text-[#564735]">Proposed title appears distinct and conflict-free in this jurisdiction.</p>
        </div>
      ) : (
        <div className="space-y-2.5" role="list">
          {displayedClashes.map((clash, idx) => (
            <div
              key={idx}
              role="listitem"
              className="p-3.5 rounded-xl bg-white border border-[#DDD1BF] hover:border-[#CFC0A8] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1C1917] text-sm font-display">
                    {clash.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0EBE0] text-[#564735] font-mono font-semibold">
                    {clash.regNo || 'REG-UNSPECIFIED'}
                  </span>
                </div>
                <div className="text-[11px] text-[#564735] flex items-center gap-2 flex-wrap">
                  <span>{clash.language || 'English'}</span>
                  <span aria-hidden="true">•</span>
                  <span>{clash.state || 'National'}</span>
                  <span aria-hidden="true">•</span>
                  <span className="text-[#1C1917] font-medium">{clash.reason}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <div className={`text-base font-extrabold font-mono ${
                    clash.similarity >= 80 ? 'text-rose-800' :
                    clash.similarity >= 50 ? 'text-amber-900' : 'text-stone-800'
                  }`}>
                    {clash.similarity}%
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#564735] font-bold font-mono">
                    {clash.matchType}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
