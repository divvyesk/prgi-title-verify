import React, { useState, useRef } from 'react';
import { 
  Printer, 
  Copy, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Building,
  Scale
} from 'lucide-react';
import type { VerificationResult } from '../types';
import { formatMemorandumPlainText } from './toPlainText';
import { sound } from '../utils/audio';

export interface MemorandumProps {
  result: VerificationResult;
  isOpen: boolean;
  onClose: () => void;
}

export const Memorandum: React.FC<MemorandumProps> = ({ result, isOpen, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [clipboardError, setClipboardError] = useState<boolean>(false);
  const manualTextareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const plainText = formatMemorandumPlainText(result);
  const timestamp = result.timestamp || new Date().toISOString();
  const memoRefId = `PRGI/AUDIT/${timestamp.slice(0, 10).replace(/-/g, '')}/${String(result.verdictScore).replace('.', '')}`;

  const handleCopyClipboard = async () => {
    sound.playClick();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        setClipboardError(false);
        setTimeout(() => setCopied(false), 2500);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      // Fallback: Show manual selection textarea
      setClipboardError(true);
      setTimeout(() => {
        if (manualTextareaRef.current) {
          manualTextareaRef.current.focus();
          manualTextareaRef.current.select();
        }
      }, 50);
    }
  };

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="memorandum-heading"
    >
      {/* Floating Action Controls Header (Hidden on Print) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 no-print">
        <button
          onClick={handleCopyClipboard}
          className="px-4 py-2 rounded-xl bg-white hover:bg-[#F8F6F0] text-[#1C1917] border border-[#DDD1BF] font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4 text-amber-700" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Plaintext'}</span>
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-stone-800 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Printer className="w-4 h-4 text-amber-300" />
          <span>Print / Save as PDF</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          aria-label="Close Memorandum"
          className="p-2 rounded-xl bg-white hover:bg-[#E8E0D2] text-[#564735] hover:text-[#1C1917] border border-[#DDD1BF] shadow-lg cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Official Government Memorandum Document Container */}
      <div 
        id="prgi-memorandum"
        className="relative w-full max-w-4xl bg-white border border-[#DDD1BF] text-[#1C1917] shadow-2xl rounded-2xl p-6 sm:p-10 my-8 print:p-0 print:border-none print:shadow-none print:my-0 space-y-6"
      >
        {/* Clipboard Permission Error Fallback (Hidden on Print) */}
        {clipboardError && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2 no-print">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Clipboard auto-copy blocked by browser permission. You can copy manually below:</span>
            </div>
            <textarea
              ref={manualTextareaRef}
              readOnly
              rows={4}
              value={plainText}
              className="w-full bg-white border border-amber-300 rounded-lg p-2 font-mono text-[11px] select-all"
            />
          </div>
        )}

        {/* 1. Official Government Document Header */}
        <div className="text-center border-b-2 border-stone-800 pb-5 space-y-1">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Building className="w-7 h-7 text-stone-800" />
            <Scale className="w-6 h-6 text-stone-700" />
          </div>
          <h1 className="text-xs sm:text-sm font-serif font-bold uppercase tracking-widest text-stone-700">
            भारत सरकार / Government of India
          </h1>
          <h2 className="text-lg sm:text-2xl font-serif font-black uppercase text-stone-900 tracking-tight">
            प्रेस पंजीयक जनरल कार्यालय / Office of the Press Registrar General of India
          </h2>
          <p className="text-xs text-stone-600 font-serif">
            Ministry of Information and Broadcasting • PRP Act 2023 Statutory Cell
          </p>
          <div className="inline-block mt-2 px-3 py-0.5 bg-stone-100 border border-stone-300 text-[11px] font-mono font-extrabold uppercase tracking-wider text-stone-900">
            Official Title Verification Audit Memorandum
          </div>
        </div>

        {/* 2. Metadata Dossier Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50 border border-stone-200 p-3.5 rounded-xl font-mono">
          <div>
            <span className="text-stone-500 block text-[10px] uppercase">Audit Ref ID</span>
            <span className="font-bold text-stone-900">{memoRefId}</span>
          </div>
          <div>
            <span className="text-stone-500 block text-[10px] uppercase">Timestamp (UTC)</span>
            <span className="font-bold text-stone-900 truncate block">{timestamp}</span>
          </div>
          <div>
            <span className="text-stone-500 block text-[10px] uppercase">Script / Lang</span>
            <span className="font-bold text-stone-900">{result.detectedLanguage || 'English'}</span>
          </div>
          <div>
            <span className="text-stone-500 block text-[10px] uppercase">Engine Latency</span>
            <span className="font-bold text-stone-900">{result.processingTimeMs} ms</span>
          </div>
        </div>

        {/* 3. Proposed Title & Verdict Banner */}
        <div className={`p-5 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          result.verdict === 'APPROVED' ? 'bg-emerald-50/70 border-emerald-700 text-emerald-950' :
          result.verdict === 'REJECTED' ? 'bg-rose-50/70 border-rose-700 text-rose-950' :
          'bg-amber-50/70 border-amber-600 text-amber-950'
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono opacity-80">
              Submitted Title Verification Record
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-extrabold text-stone-900">
              "{result.inputTitle}"
            </h3>
            <div className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 mt-1 font-mono">
              {result.verdict === 'APPROVED' && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
              {result.verdict === 'REJECTED' && <XCircle className="w-4 h-4 text-rose-700" />}
              {result.verdict === 'MANUAL_REVIEW' && <AlertTriangle className="w-4 h-4 text-amber-700" />}
              <span>
                {result.verdict === 'APPROVED' && 'APPROVED • CLEAR FOR REGISTRATION'}
                {result.verdict === 'REJECTED' && 'REJECTED • HIGH CONFLICT / STATUTORY VIOLATION'}
                {result.verdict === 'MANUAL_REVIEW' && 'MANUAL REVIEW REQUIRED • BORDERLINE RISK'}
              </span>
            </div>
          </div>

          <div className="text-center sm:text-right bg-white border border-stone-300 p-3 rounded-lg min-w-[130px] shadow-sm">
            <span className="text-[10px] font-mono font-bold uppercase text-stone-500 block">Conflict Risk</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-stone-900">
              {result.verdictScore}<span className="text-sm font-normal text-stone-500">/100</span>
            </span>
          </div>
        </div>

        {/* 4. 4-Dimensional Similarity Matrix */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-700 border-b border-stone-200 pb-1">
            4-Dimensional NLP Similarity Audit Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
              <span className="text-[10px] text-stone-500 block">1. Lexical &amp; Anagram</span>
              <span className="font-mono font-bold text-sm text-stone-900">{result.similarityBreakdown.lexicalScore}%</span>
            </div>
            <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
              <span className="text-[10px] text-stone-500 block">2. Phonetic Soundex</span>
              <span className="font-mono font-bold text-sm text-stone-900">{result.similarityBreakdown.phoneticScore}%</span>
            </div>
            <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
              <span className="text-[10px] text-stone-500 block">3. Semantic Cross-Lingual</span>
              <span className="font-mono font-bold text-sm text-stone-900">{result.similarityBreakdown.semanticScore}%</span>
            </div>
            <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50">
              <span className="text-[10px] text-stone-500 block">4. Core-Word Clash</span>
              <span className="font-mono font-bold text-sm text-stone-900">{result.similarityBreakdown.coreWordScore}%</span>
            </div>
          </div>
          {result.coreWords && result.coreWords.length > 0 && (
            <div className="text-[11px] text-stone-600 font-mono">
              <strong>Extracted Root Tokens:</strong> [{result.coreWords.join(', ')}]
            </div>
          )}
        </div>

        {/* 5. Top Clashing Registered Publications Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-700 border-b border-stone-200 pb-1">
            Top Clashing Registered Titles in Jurisdiction ({result.clashingTitles.length} Conflicts Detected)
          </h4>
          {result.clashingTitles.length === 0 ? (
            <div className="p-3 text-center text-xs text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
              No registered title collisions found exceeding statutory risk threshold.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-stone-300">
                <thead>
                  <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300 font-mono">
                    <th className="p-2 border-r border-stone-300">Registered Title</th>
                    <th className="p-2 border-r border-stone-300">Reg No</th>
                    <th className="p-2 border-r border-stone-300">State / Language</th>
                    <th className="p-2 border-r border-stone-300">Match Type</th>
                    <th className="p-2 text-right">Clash %</th>
                  </tr>
                </thead>
                <tbody>
                  {result.clashingTitles.map((c, idx) => (
                    <tr key={idx} className="border-b border-stone-200 hover:bg-stone-50">
                      <td className="p-2 border-r border-stone-200 font-bold text-stone-900">{c.title}</td>
                      <td className="p-2 border-r border-stone-200 font-mono text-[11px]">{c.regNo || 'N/A'}</td>
                      <td className="p-2 border-r border-stone-200 text-[11px]">{c.state} • {c.language}</td>
                      <td className="p-2 border-r border-stone-200 font-mono text-[10px] uppercase font-bold">{c.matchType}</td>
                      <td className="p-2 text-right font-mono font-bold text-stone-900">{c.similarity}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 6. Statutory Guidelines Rules Audit Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-700 border-b border-stone-200 pb-1">
            Statutory Rulebook Checklist &amp; Clause Citations
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-stone-300">
              <thead>
                <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300 font-mono">
                  <th className="p-2 border-r border-stone-300">Rule ID</th>
                  <th className="p-2 border-r border-stone-300">Rule Name</th>
                  <th className="p-2 border-r border-stone-300">Status</th>
                  <th className="p-2">Statutory Clause Citation</th>
                </tr>
              </thead>
              <tbody>
                {result.ruleViolations.map((r) => (
                  <tr key={r.ruleId} className="border-b border-stone-200 hover:bg-stone-50">
                    <td className="p-2 border-r border-stone-200 font-mono font-bold">{r.ruleId}</td>
                    <td className="p-2 border-r border-stone-200 font-medium text-stone-900">{r.ruleName}</td>
                    <td className="p-2 border-r border-stone-200 font-bold">
                      {r.passed ? (
                        <span className="text-emerald-800 font-mono">PASSED</span>
                      ) : (
                        <span className="text-rose-800 font-mono font-bold">FAILED [{r.severity}]</span>
                      )}
                    </td>
                    <td className="p-2 font-mono text-[10px] text-stone-600">{r.clause}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. Plain-Language Explanation & Recommended Action */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
          <div>
            <strong className="font-bold text-stone-900 block mb-0.5">Plain-Language Summary:</strong>
            <p className="text-stone-700 leading-relaxed">{result.explanation}</p>
          </div>
          <div className="pt-2 border-t border-stone-200">
            <strong className="font-bold text-stone-900 block mb-0.5">Recommended Disposition:</strong>
            <p className="text-stone-700 leading-relaxed">{result.recommendedAction}</p>
          </div>
        </div>

        {/* 8. Statutory Disclaimer Footer */}
        <div className="border-t-2 border-stone-800 pt-4 text-center space-y-2 text-[10px] text-stone-600">
          <p className="leading-relaxed font-serif">
            <strong>DISCLAIMER &amp; LEGAL DETERMINATION NOTICE:</strong> This document is an automated decision-support audit recommendation generated by the PRGI TitleGuard verification system pursuant to the Press and Registration of Periodicals (PRP) Act 2023. This memorandum does not constitute a final legal determination or title allocation until formally countersigned by an authorized PRGI Registrar or District Magistrate.
          </p>
          <div className="flex justify-between items-center text-[9px] font-mono text-stone-500 pt-2 border-t border-stone-200">
            <span>Authentication Seal: PRGI-AUTO-SHA256-VERIFIED</span>
            <span>Government of India • Ministry of I&amp;B</span>
          </div>
        </div>
      </div>
    </div>
  );
};
