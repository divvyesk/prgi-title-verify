export type LanguageCode = 
  | 'English' 
  | 'Hindi' 
  | 'Bengali' 
  | 'Marathi' 
  | 'Tamil' 
  | 'Telugu' 
  | 'Gujarati' 
  | 'Urdu' 
  | 'Punjabi' 
  | 'Odia' 
  | 'Malayalam' 
  | 'Kannada' 
  | 'Assamese' 
  | 'Other';

export type VerdictStatus = 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED';

export interface TitleRecord {
  id?: string;
  title_id?: number | string;
  title: string;
  language?: string;
  language_normalized?: string;
  state?: string;
  publication_state?: string;
  district?: string;
  publication_district?: string;
  regNo?: string;
  registration_number?: string;
  regDate?: string;
  registration_date?: string;
  publisher?: string;
  owner?: string;
  periodicity?: string;
  script?: string;
  title_transliterated?: string;
  title_core?: string;
  data_quality_status?: string;
}

export interface SimilarityScores {
  lexicalScore: number;     // 0-100 (Edit distance / Levenshtein / pg_trgm)
  phoneticScore: number;    // 0-100 (Metaphone / Soundex)
  semanticScore: number;    // 0-100 (BGE-M3 Vector / Multilingual cross-lingual)
  coreWordScore: number;    // 0-100 (Root token clash after stopword removal)
  blendedScore: number;     // Combined aggregate conflict probability
}

export interface ClashingTitle {
  title: string;
  regNo?: string;
  registration_number?: string;
  language?: string;
  state?: string;
  publication_state?: string;
  district?: string;
  similarity: number; // 0 - 100
  matchType: 'LEXICAL' | 'PHONETIC' | 'SEMANTIC' | 'CORE_WORD' | 'COMBINATION';
  matchedCoreWord?: string;
  reason: string;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  clause: string;
  passed: boolean;
  triggerPhrase?: string;
}

export interface VerificationResult {
  inputTitle: string;
  normalizedTitle: string;
  detectedLanguage: string;
  transliteratedTitle: string;
  coreWords: string[];
  verdict: VerdictStatus;
  verdictScore: number; // 0 - 100 conflict risk (0 = fully clean, 100 = total clash)
  similarityBreakdown: SimilarityScores;
  clashingTitles: ClashingTitle[];
  ruleViolations: RuleViolation[];
  explanation: string;
  recommendedAction: string;
  guidelineCitations: string[];
  stageTimings?: Record<string, number>;
  engine?: 'LIVE' | 'OFFLINE';
  cached?: boolean;
  processingTimeMs: number;
  timestamp: string;
}

export interface GeneratedCandidate {
  id: string;
  title: string;
  meaning: string;
  uniquenessScore: number;
  verificationPassed: boolean;
  riskScore: number;
  category: string;
  rationale: string;
}

export interface OfficerCase {
  id: string;
  applicantName: string;
  proposedTitle: string;
  language: string;
  state: string;
  periodicity: string;
  submissionDate: string;
  riskScore: number;
  verdict: VerdictStatus;
  primaryConflict?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  copilotDecisionNote?: string;
}
