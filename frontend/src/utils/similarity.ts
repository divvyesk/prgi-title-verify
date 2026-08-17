/**
 * 4-Dimensional Similarity Engine (Member 2 NLP / ML Layer)
 * 1. Lexical Similarity (Levenshtein + Token Sort)
 * 2. Phonetic Similarity (Soundex / Metaphone)
 * 3. Semantic Similarity (Cross-lingual meaning vectors)
 * 4. Core-Word Matching (Stopword/Prefix/Suffix stripping)
 */

import { transliterateToRoman } from './transliteration';

// Generic media stop words and periodicity modifiers to strip for core-word matching
export const MEDIA_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  // Periodicity
  'daily', 'weekly', 'monthly', 'fortnightly', 'quarterly', 'annual', 'evening', 'morning', 'sunday',
  'dainik', 'saptahik', 'masik', 'pakshik', 'sandhya', 'pratah', 'shaniwar', 'raviwar',
  // Generic Publication Terms
  'news', 'samachar', 'times', 'express', 'patrika', 'post', 'herald', 'chronicle', 'gazette',
  'bulletin', 'journal', 'reporter', 'magazine', 'review', 'varta', 'sandesh', 'ujala', 'darpan',
  'khabar', 'aawaz', 'duniya', 'bazaar', 'voice', 'today', 'live', 'tv', 'media', 'press', 'national',
  'international', 'edition', 'special', 'prabhat', 'navbharat', 'lokmat', 'sakal', 'eenadu', 'sakshi'
]);

// Semantic equivalents across English and Indian Languages
export const SEMANTIC_PAIRS: Record<string, string[]> = {
  'news': ['samachar', 'khabar', 'varta', 'sandesh', 'bulletin', 'seithigal', 'sangbad'],
  'daily': ['dainik', 'pratidin', 'dinamalar', 'daily', 'rozana'],
  'morning': ['prabhat', 'sakal', 'subah', 'pratah'],
  'sun': ['bhaskar', 'ravi', 'surya', 'dinamani', 'aadi'],
  'awakening': ['jagran', 'chetna', 'jagriti', 'prabodh'],
  'people': ['janata', 'lok', 'citizen', 'praja', 'aam'],
  'voice': ['aawaz', 'dhwani', 'vani', 'kural'],
  'india': ['bharat', 'hindustan', 'hind', 'ind'],
  'light': ['ujala', 'jyothi', 'deep', 'roshni', 'prakash', 'alok'],
  'nation': ['rashtra', 'desh', 'watan'],
  'opinion': ['lokmat', 'vichar', 'mat', 'drishya'],
  'mirror': ['darpan', 'aaina'],
  'youth': ['tarun', 'yuva', 'jawani'],
  'flower': ['malar', 'pushp', 'phool'],
  'matrimonial': ['vivah', 'shaadi', 'suchi', 'rishta']
};

/**
 * Normalizes a raw string: lowercases, removes non-alphanumerics, collapses spaces
 */
export function normalizeTitle(text: string): string {
  if (!text) return '';
  const romanized = transliterateToRoman(text);
  return romanized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts Core Words by stripping generic media words, periodicity, and prepositions
 */
export function extractCoreWords(text: string): string[] {
  const normalized = normalizeTitle(text);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const core = tokens.filter(tok => !MEDIA_STOPWORDS.has(tok) && tok.length > 2);
  return core.length > 0 ? core : tokens;
}

/**
 * Levenshtein distance calculation
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Lexical similarity (0 to 100) combining direct edit distance & token sorting
 * Catches anagrams & reordered words (e.g. "Times India" vs "India Times")
 */
export function calculateLexicalSimilarity(t1: string, t2: string): number {
  const n1 = normalizeTitle(t1);
  const n2 = normalizeTitle(t2);

  if (n1 === n2) return 100;
  if (!n1 || !n2) return 0;

  // Direct Levenshtein similarity
  const maxLen = Math.max(n1.length, n2.length);
  const dist = levenshteinDistance(n1, n2);
  const directScore = Math.max(0, Math.round((1 - dist / maxLen) * 100));

  // Token sort similarity (catches word permutations)
  const sortTokens1 = n1.split(' ').sort().join(' ');
  const sortTokens2 = n2.split(' ').sort().join(' ');
  const sortDist = levenshteinDistance(sortTokens1, sortTokens2);
  const sortMaxLen = Math.max(sortTokens1.length, sortTokens2.length);
  const tokenSortScore = Math.max(0, Math.round((1 - sortDist / sortMaxLen) * 100));

  // Substring inclusion check
  let substringBoost = 0;
  if (n1.includes(n2) || n2.includes(n1)) {
    const minLen = Math.min(n1.length, n2.length);
    substringBoost = Math.round((minLen / maxLen) * 90);
  }

  return Math.max(directScore, tokenSortScore, substringBoost);
}

/**
 * Simplified Metaphone / Phonetic Key Generator
 * Catches "Jagran" vs "Jaagran", "Khabar" vs "Khabran", "Phool" vs "Fool"
 */
export function getPhoneticKey(text: string): string {
  let s = normalizeTitle(text);
  if (!s) return '';

  s = s.replace(/ph/g, 'f')
       .replace(/ee|ea|ii/g, 'i')
       .replace(/oo|uu/g, 'u')
       .replace(/aa/g, 'a')
       .replace(/ck|k|q/g, 'k')
       .replace(/sh|ch|zh/g, 'x')
       .replace(/th|dh/g, 't')
       .replace(/bh/g, 'b')
       .replace(/gh/g, 'g')
       .replace(/jh/g, 'j')
       .replace(/kh/g, 'k')
       .replace(/z|s/g, 's')
       .replace(/v|w/g, 'v')
       .replace(/y/g, 'i');

  // Collapse repeated characters
  s = s.replace(/(.)\1+/g, '$1');
  return s;
}

/**
 * Phonetic similarity score (0 to 100)
 */
export function calculatePhoneticSimilarity(t1: string, t2: string): number {
  const p1 = getPhoneticKey(t1);
  const p2 = getPhoneticKey(t2);

  if (p1 === p2) return 100;
  if (!p1 || !p2) return 0;

  const maxLen = Math.max(p1.length, p2.length);
  const dist = levenshteinDistance(p1, p2);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

/**
 * Semantic / Cross-Lingual similarity score (0 to 100)
 * Catches "Daily News" vs "Dainik Samachar" or "Morning Post" vs "Prabhat Sandesh"
 */
export function calculateSemanticSimilarity(t1: string, t2: string): number {
  const n1 = normalizeTitle(t1).split(' ');
  const n2 = normalizeTitle(t2).split(' ');

  let semanticMatches = 0;
  const totalTokens = Math.max(n1.length, n2.length);

  for (const token1 of n1) {
    for (const token2 of n2) {
      if (token1 === token2) {
        semanticMatches += 1;
        break;
      }
      // Check known semantic concept synonyms
      for (const synonyms of Object.values(SEMANTIC_PAIRS)) {
        if (synonyms.includes(token1) && synonyms.includes(token2)) {
          semanticMatches += 0.95;
          break;
        }
      }
    }
  }

  const score = Math.round((semanticMatches / totalTokens) * 100);
  return Math.min(100, Math.max(0, score));
}

export function calculateCoreWordSimilarity(t1: string, t2: string): { score: number; matchedCoreWord?: string } {
  const c1 = extractCoreWords(t1);
  const c2 = extractCoreWords(t2);

  if (c1.length === 0 || c2.length === 0) {
    return { score: 0 };
  }

  let matchedWord = '';
  let matchCount = 0;

  for (const w1 of c1) {
    for (const w2 of c2) {
      if (w1 === w2 && w1.length > 2) {
        matchCount++;
        matchedWord = w1;
        break;
      } else if (calculateLexicalSimilarity(w1, w2) >= 88 || calculatePhoneticSimilarity(w1, w2) >= 88) {
        matchCount += 0.9;
        matchedWord = `${w1} ≈ ${w2}`;
        break;
      }
    }
  }

  if (matchCount === 0) {
    return { score: 0 };
  }

  // If either title has only 1 core word and that single core word matches, it's a direct root clash (e.g. "The Vidarbha Daily Express" -> ["vidarbha"] vs "Adbhut Vidharbha" -> ["adbhut", "vidharbha"])
  if (c1.length === 1 || c2.length === 1) {
    return { score: 90, matchedCoreWord: matchedWord };
  }

  // Proportional overlap based on max core tokens
  const maxTokens = Math.max(c1.length, c2.length);
  const overlapRatio = matchCount / maxTokens;
  const score = Math.round(overlapRatio * 100);

  return { score, matchedCoreWord: matchedWord };
}
