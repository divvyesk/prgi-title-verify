import { useState, useEffect, useCallback, useRef } from 'react';
import type { OfficerCase } from '../../types';
import fixtureCasesRaw from '../../data/officer_cases.json';

export interface DecisionRecord {
  token: string;
  timestamp: string;
  action: 'APPROVED' | 'REJECTED';
  officer: string;
  note: string;
}

export interface UseCasesResult {
  cases: OfficerCase[];
  isLoading: boolean;
  error: string | null;
  source: 'LIVE' | 'FIXTURE';
  updateCaseStatus: (id: string, newStatus: OfficerCase['status'], note?: string) => void;
  updateCaseNote: (id: string, note: string) => void;
  recordDecision: (id: string, action: 'APPROVED' | 'REJECTED', note: string) => DecisionRecord;
  fetchDraftMemo: (caseData: OfficerCase) => Promise<string>;
  reloadCases: () => Promise<void>;
}

const fixtureCases = fixtureCasesRaw as OfficerCase[];

// Initial sequence starting point for client-side reference generation
let globalTokenSequence = 42;

export const useCases = (): UseCasesResult => {
  const [cases, setCases] = useState<OfficerCase[]>(fixtureCases);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'LIVE' | 'FIXTURE'>('FIXTURE');
  const tokenSeqRef = useRef<number>(globalTokenSequence);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Attempt to query the backend endpoint if available
      const response = await fetch('/v1/cases', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setCases(data);
        setSource('LIVE');
      } else {
        setCases(fixtureCases);
        setSource('FIXTURE');
      }
    } catch (err) {
      // Graceful fallback to fixture data on any network or 404 error
      const message = err instanceof Error ? err.message : 'Backend unreachable';
      setError(message);
      setCases(fixtureCases);
      setSource('FIXTURE');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const updateCaseStatus = useCallback((id: string, newStatus: OfficerCase['status'], note?: string) => {
    setCases((prevCases) =>
      prevCases.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          status: newStatus,
          ...(note !== undefined ? { copilotDecisionNote: note } : {})
        };
      })
    );
  }, []);

  const updateCaseNote = useCallback((id: string, note: string) => {
    setCases((prevCases) =>
      prevCases.map((c) => (c.id === id ? { ...c, copilotDecisionNote: note } : c))
    );
  }, []);

  // Records a formal officer decision (Endorsement or Rejection) with generated token
  const recordDecision = useCallback((id: string, action: 'APPROVED' | 'REJECTED', note: string): DecisionRecord => {
    // NOTE: Sequence number generated client-side for SIH local mock; backend /v1/officer/endorse will assign authoritative sequential token in production.
    tokenSeqRef.current += 1;
    globalTokenSequence = tokenSeqRef.current;
    
    const seqStr = String(tokenSeqRef.current).padStart(5, '0');
    const token = `PRGI/2026/OFF/${seqStr}`;
    const timestamp = new Date().toISOString(); // ISO 8601 UTC
    const officer = 'PRGI Verified Officer E-Token (Auth #DL-908)';

    setCases((prevCases) =>
      prevCases.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          status: action,
          copilotDecisionNote: note,
          decisionToken: token,
          decisionTimestamp: timestamp,
          decisionOfficer: officer
        };
      })
    );

    return {
      token,
      timestamp,
      action,
      officer,
      note
    };
  }, []);

  // Fetch or generate AI Copilot Decision Memo
  const fetchDraftMemo = useCallback(async (caseData: OfficerCase): Promise<string> => {
    try {
      const res = await fetch('/v1/officer/draft-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          proposedTitle: caseData.proposedTitle,
          verdict: caseData.verdict,
          riskScore: caseData.riskScore,
          state: caseData.state,
          language: caseData.language
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.memo) return data.memo;
      }
    } catch {
      // Backend not running, proceed to fallback draft below
    }

    // Structured statutory legal draft fallback citing relevant clauses
    if (caseData.verdict === 'MANUAL_REVIEW') {
      return `OFFICIAL PRGI DECISION MEMORANDUM (DRAFT)
Case Reference: ${caseData.id}
Proposed Title: "${caseData.proposedTitle}"
Jurisdiction: ${caseData.state} (${caseData.language}, ${caseData.periodicity})

STATUTORY FINDINGS & CITATION:
Under Press and Registration of Periodicals (PRP) Act 2023 Guidelines, Section 3.2(b) (Phonetic and Deceptive Resemblance), the proposed title exhibits moderate phonetic collision (${caseData.riskScore}% assessed conflict risk) with registered periodical "${caseData.primaryConflict || 'existing publications in circulation'}". Adding generic prefixes ("The", "Daily") without distinctive geographic or institutional tokens remains borderline.

RECOMMENDED DISPOSITION:
Endorse with requirement for addition of distinctive sub-district qualifier, or confirm geographic disambiguation prior to Certificate of Title Verification issuance.`;
    }

    if (caseData.verdict === 'REJECTED') {
      return `OFFICIAL PRGI DECISION MEMORANDUM (DRAFT)
Case Reference: ${caseData.id}
Proposed Title: "${caseData.proposedTitle}"
Jurisdiction: ${caseData.state} (${caseData.language})

STATUTORY FINDINGS & CITATION:
The proposed title violates PRP Act 2023 Statutory Guidelines, Section 4.1 (Prohibition of Commercial Advertising Circulars and Deceptive Similarity). Assessed conflict risk of ${caseData.riskScore}% exceeds statutory thresholds.

RECOMMENDED DISPOSITION:
Summary rejection order issued. Advise applicant to utilize PRGI Agentic Title Studio for distinctive pre-cleared alternatives.`;
    }

    return `OFFICIAL PRGI DECISION MEMORANDUM (DRAFT)
Case Reference: ${caseData.id}
Proposed Title: "${caseData.proposedTitle}"
Jurisdiction: ${caseData.state} (${caseData.language})

STATUTORY FINDINGS & CITATION:
Title passes all statutory admissibility checks under PRP Act 2023 Guidelines. Assessed conflict score is ${caseData.riskScore}% (well below the 45% threshold). No deceptively similar periodicals found in circulation.

RECOMMENDED DISPOSITION:
Approved for issuance of official Certificate of Title Verification.`;
  }, []);

  return {
    cases,
    isLoading,
    error,
    source,
    updateCaseStatus,
    updateCaseNote,
    recordDecision,
    fetchDraftMemo,
    reloadCases: fetchCases
  };
};
