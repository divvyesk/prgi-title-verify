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
  id: string;
  title: string;
  language: string;
  state: string;
  regNo: string;
  regDate: string;
  publisher?: string;
  owner?: string;
  periodicity?: string;
}

export interface SimilarityScores {
  lexicalScore: number;     // 0-100 (Edit distance / Levenshtein)
  phoneticScore: number;    // 0-100 (Metaphone / Soundex)
  semanticScore: number;    // 0-100 (Vector / Multilingual cross-lingual)
  coreWordScore: number;    // 0-100 (Root token clash after stopword removal)
  blendedScore: number;     // Combined aggregate conflict probability
}

export interface ClashingTitle {
  title: string;
  regNo: string;
  language: string;
  state: string;
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
  decisionToken?: string;
  decisionTimestamp?: string;
  decisionOfficer?: string;
}
