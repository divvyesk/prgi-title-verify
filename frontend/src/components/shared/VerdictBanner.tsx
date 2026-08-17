import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { VerdictStatus } from '../../types';

export interface VerdictBannerProps {
  verdict: VerdictStatus;
  verdictScore: number;
  explanation: string;
  recommendedAction?: string;
  inputTitle: string;
  processingTimeMs?: number;
  children?: React.ReactNode;
  className?: string;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({
  verdict,
  verdictScore,
  explanation,
  recommendedAction,
  inputTitle,
  processingTimeMs,
  children,
  className = ''
}) => {
  return (
    <section
      role="region"
      aria-label="Title Verification Verdict & Conflict Risk Assessment"
      aria-live="polite"
      className={`p-6 sm:p-8 rounded-2xl border ${
        verdict === 'APPROVED' ? 'beige-card-success' :
        verdict === 'REJECTED' ? 'beige-card-danger' : 'beige-card-warning'
      } ${className}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Status Badge & Title Details */}
        <div className="flex items-start gap-4">
          <div 
            aria-hidden="true"
            className={`p-4 rounded-2xl text-white shadow-md flex-shrink-0 ${
              verdict === 'APPROVED' ? 'bg-emerald-700' :
              verdict === 'REJECTED' ? 'bg-rose-700' : 'bg-amber-700'
            }`}
          >
            {verdict === 'APPROVED' && <CheckCircle2 className="w-8 h-8" />}
            {verdict === 'REJECTED' && <XCircle className="w-8 h-8" />}
            {verdict === 'MANUAL_REVIEW' && <AlertTriangle className="w-8 h-8" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Explicit Text Label for Verdict Tier - Never Color Alone */}
              <span className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider border ${
                verdict === 'APPROVED' ? 'bg-emerald-100 text-emerald-950 border-emerald-400' :
                verdict === 'REJECTED' ? 'bg-rose-100 text-rose-950 border-rose-400' :
                'bg-amber-100 text-amber-950 border-amber-400'
              }`}>
                {verdict === 'APPROVED' && 'APPROVED • CLEAR FOR REGISTRATION'}
                {verdict === 'REJECTED' && 'REJECTED • HIGH CONFLICT / STATUTORY VIOLATION'}
                {verdict === 'MANUAL_REVIEW' && 'MANUAL REVIEW REQUIRED • BORDERLINE RISK'}
              </span>

              {processingTimeMs !== undefined && (
                <span className="text-xs text-[#564735] font-mono">
                  Latency: {processingTimeMs}ms
                </span>
              )}
            </div>

            <h3 className="text-2xl sm:text-3xl font-editorial font-bold text-[#1C1917] mt-2">
              "{inputTitle}"
            </h3>
            <p className="text-xs sm:text-sm text-[#292524] mt-1 max-w-2xl leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>

        {/* Conflict Risk Score Gauge */}
        <div className="flex flex-col items-center justify-center bg-white px-6 py-4 rounded-xl border border-[#DDD1BF] min-w-[170px] shadow-sm flex-shrink-0">
          <div className="text-[11px] font-bold text-[#564735] uppercase tracking-wider mb-1 font-mono">
            Conflict Risk Score
          </div>
          <div className={`text-3xl sm:text-4xl font-extrabold font-mono ${
            verdict === 'APPROVED' ? 'text-emerald-800' :
            verdict === 'REJECTED' ? 'text-rose-800' : 'text-amber-900'
          }`}>
            {verdictScore}<span className="text-base text-[#78716C]">/100</span>
          </div>
          <div className="text-[11px] text-[#564735] mt-1 font-bold font-mono">
            {verdict === 'APPROVED' ? 'Safe Clearance' :
             verdict === 'REJECTED' ? 'Critical Clash' : 'Moderate Ambiguity'}
          </div>
        </div>
      </div>

      {/* Guidance Ribbon & Actions */}
      {(recommendedAction || children) && (
        <div className="mt-6 pt-4 border-t border-[#E5DDD0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#292524]">
            <strong className="text-[#1C1917]">Guidance:</strong>
            <span>{recommendedAction || 'Follow standard PRGI review protocol.'}</span>
          </div>

          {children && (
            <div className="flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
