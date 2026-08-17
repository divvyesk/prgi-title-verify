import React from 'react';
import { TrendingUp } from 'lucide-react';
import type { SimilarityScores } from '../../types';

export interface SimilarityMatrixProps {
  similarityBreakdown: SimilarityScores;
  coreWords?: string[];
  className?: string;
  badgeLabel?: string;
}

export const SimilarityMatrix: React.FC<SimilarityMatrixProps> = ({
  similarityBreakdown,
  coreWords = [],
  className = '',
  badgeLabel = 'NLP Engine'
}) => {
  return (
    <section
      role="region"
      aria-label="4-Dimensional NLP Similarity Audit Matrix"
      className={`beige-card rounded-2xl p-6 space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#E8E0D2] pb-3">
        <div className="flex items-center gap-2 text-[#1C1917] font-bold text-sm">
          <TrendingUp className="w-4 h-4 text-amber-800" aria-hidden="true" />
          <span>4-Dimensional Similarity Matrix</span>
        </div>
        <span className="text-[11px] text-[#564735] font-mono">{badgeLabel}</span>
      </div>

      <div className="space-y-4">
        {/* 1. Lexical Similarity */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#292524] font-semibold">1. Lexical &amp; Word Order Anagram</span>
            <span className="font-mono font-bold text-amber-900">{similarityBreakdown.lexicalScore}%</span>
          </div>
          <div 
            role="progressbar" 
            aria-label="Lexical Similarity"
            aria-valuenow={similarityBreakdown.lexicalScore}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-[#EFE8DC] h-2 rounded-full overflow-hidden border border-[#E2D7C5]"
          >
            <div
              className="bg-amber-700 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, similarityBreakdown.lexicalScore))}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-[#564735] mt-1">
            Detects character shifts and word order inversions (e.g., Times India vs India Times).
          </p>
        </div>

        {/* 2. Phonetic Similarity */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#292524] font-semibold">2. Phonetic Soundex Match</span>
            <span className="font-mono font-bold text-purple-900">{similarityBreakdown.phoneticScore}%</span>
          </div>
          <div 
            role="progressbar" 
            aria-label="Phonetic Soundex Similarity"
            aria-valuenow={similarityBreakdown.phoneticScore}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-[#EFE8DC] h-2 rounded-full overflow-hidden border border-[#E2D7C5]"
          >
            <div
              className="bg-purple-700 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, similarityBreakdown.phoneticScore))}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-[#564735] mt-1">
            Detects identical pronunciation with altered spelling (e.g., Jagran vs Jaagran).
          </p>
        </div>

        {/* 3. Semantic / Multilingual Cross-Lingual */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#292524] font-semibold">3. Semantic Cross-Lingual Translation</span>
            <span className="font-mono font-bold text-emerald-900">{similarityBreakdown.semanticScore}%</span>
          </div>
          <div 
            role="progressbar" 
            aria-label="Semantic Cross-Lingual Similarity"
            aria-valuenow={similarityBreakdown.semanticScore}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-[#EFE8DC] h-2 rounded-full overflow-hidden border border-[#E2D7C5]"
          >
            <div
              className="bg-emerald-700 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, similarityBreakdown.semanticScore))}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-[#564735] mt-1">
            Detects identical meanings translated across languages (e.g., Daily News vs Dainik Samachar).
          </p>
        </div>

        {/* 4. Core-Word Match */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#292524] font-semibold">4. Core-Word Distinctive Root</span>
            <span className="font-mono font-bold text-stone-900">{similarityBreakdown.coreWordScore}%</span>
          </div>
          <div 
            role="progressbar" 
            aria-label="Core-Word Distinctive Root Similarity"
            aria-valuenow={similarityBreakdown.coreWordScore}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-[#EFE8DC] h-2 rounded-full overflow-hidden border border-[#E2D7C5]"
          >
            <div
              className="bg-stone-800 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, similarityBreakdown.coreWordScore))}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-[#564735] mt-1">
            Strips media filler words ("The", "Daily", "Patrika") to uncover root collisions.
          </p>
        </div>
      </div>

      {/* Extracted Core Root Tokens */}
      {coreWords.length > 0 && (
        <div className="p-3 bg-white rounded-xl border border-[#DDD1BF] text-xs">
          <span className="text-[#564735] font-semibold mr-2">Extracted Root Tokens:</span>
          {coreWords.map((word, idx) => (
            <span key={idx} className="inline-block font-mono font-bold px-2 py-0.5 mr-1.5 rounded bg-amber-100 text-amber-950 border border-amber-400">
              {word}
            </span>
          ))}
        </div>
      )}
    </section>
  );
};
