import React from 'react';
import { FileText, CheckCircle2, XCircle } from 'lucide-react';
import type { RuleViolation } from '../../types';

export interface RuleViolationsGridProps {
  ruleViolations: RuleViolation[];
  className?: string;
  badgeLabel?: string;
}

export const RuleViolationsGrid: React.FC<RuleViolationsGridProps> = ({
  ruleViolations,
  className = '',
  badgeLabel = 'PRGI 2025 Act'
}) => {
  return (
    <div className={`beige-card rounded-2xl p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
        <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
          <FileText className="w-4 h-4 text-amber-700" />
          <span>Deterministic PRGI Statutory Rulebook</span>
        </div>
        <span className="text-[11px] text-[#75634B] font-mono">{badgeLabel}</span>
      </div>

      {ruleViolations.length === 0 ? (
        <div className="p-6 text-center text-[#75634B] bg-white rounded-xl border border-[#DDD1BF]">
          <CheckCircle2 className="w-7 h-7 text-emerald-700 mx-auto mb-1.5" />
          <p className="font-bold text-xs text-[#1C1917]">All Statutory Rulebook Checks Passed</p>
          <p className="text-[11px] text-[#75634B]">No guideline violations detected under the Press & Registration of Periodicals Act.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ruleViolations.map((rule) => (
            <div
              key={rule.ruleId}
              className={`p-3.5 rounded-xl border ${
                rule.passed
                  ? 'bg-white border-[#E2D7C5] text-[#292524]'
                  : 'bg-rose-50 border-rose-200 text-[#292524]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F8F6F0] border border-[#DDD1BF] text-[#564735]">
                    {rule.ruleId}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                    rule.severity === 'CRITICAL' ? 'bg-rose-200 text-rose-900' :
                    rule.severity === 'WARNING' ? 'bg-amber-200 text-amber-900' :
                    'bg-blue-100 text-blue-900'
                  }`}>
                    {rule.severity}
                  </span>
                </div>

                {rule.passed ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PASSED</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>FAILED</span>
                  </span>
                )}
              </div>

              <div className="font-bold text-xs text-[#1C1917] mb-1">{rule.ruleName}</div>
              <p className="text-[11px] text-[#564735] mb-2 leading-relaxed">
                {rule.description}
              </p>
              
              <div className="text-[10px] text-[#75634B] font-mono bg-[#FAF7F2] p-1.5 rounded border border-[#E8E0D2] leading-tight">
                <span className="font-bold text-[#382E22]">Citation: </span>
                {rule.clause}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
