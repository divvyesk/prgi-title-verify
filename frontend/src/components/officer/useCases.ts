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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'LIVE' | 'FIXTURE'>('FIXTURE');
  const tokenSeqRef = useRef<number>(globalTokenSequence);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let response: Response | null = null;
      try {
        response = await fetch('/api/v1/cases', {
          headers: { 'Accept': 'application/json' }
        });
      } catch {
        response = await fetch('http://127.0.0.1:8000/v1/cases', {
          headers: { 'Accept': 'application/json' }
        });
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP ${response?.status || 500}: ${response?.statusText || 'Failed'}`);
      }

      const data = await response.json();
      const loadedCases = Array.isArray(data?.cases) ? data.cases : (Array.isArray(data) ? data : null);

      if (loadedCases && loadedCases.length > 0) {
        setCases(loadedCases);
        setSource('LIVE');
      } else {
        setCases(fixtureCases);
        setSource('FIXTURE');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backend unreachable';
      setError(msg);
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
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: newStatus,
            copilotDecisionNote: note !== undefined ? note : c.copilotDecisionNote
          };
        }
        return c;
      })
    );
  }, []);

  const updateCaseNote = useCallback((id: string, note: string) => {
    setCases((prev) =>
      prev.map((c) => (c.id === id ? { ...c, copilotDecisionNote: note } : c))
    );
  }, []);

  const recordDecision = useCallback(
    (id: string, action: 'APPROVED' | 'REJECTED', note: string): DecisionRecord => {
      const targetCase = cases.find((c) => c.id === id);
      const year = new Date().getFullYear();
      tokenSeqRef.current += 1;
      const seqStr = String(tokenSeqRef.current).padStart(4, '0');
      const actionCode = action === 'APPROVED' ? 'APP' : 'REJ';
      const token = `PRGI-${year}-${actionCode}-${seqStr}`;
      const nowIso = new Date().toISOString();

      const newStatus: OfficerCase['status'] = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';

      updateCaseStatus(id, newStatus, note);

      const decisionRecord: DecisionRecord = {
        token,
        timestamp: nowIso,
        action,
        officer: 'DARSH_DESK_OFFICER_01',
        note
      };

      fetch('/api/v1/officer/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: id,
          action,
          note,
          referenceToken: token,
          officerId: 'DARSH_DESK_OFFICER_01',
          proposedTitle: targetCase?.proposedTitle || 'Unknown'
        })
      }).catch(() => {
        // Silently log in development
      });

      return decisionRecord;
    },
    [cases, updateCaseStatus]
  );

  const fetchDraftMemo = useCallback(async (caseData: OfficerCase): Promise<string> => {
    try {
      const response = await fetch(`/api/v1/officer/memo/${caseData.id}`);
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 0) return text;
      }
    } catch {
      // Fall through to client template
    }

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    return `GOVERNMENT OF INDIA
PRESS REGISTRAR GENERAL OF INDIA (PRGI)
MINISTRY OF INFORMATION AND BROADCASTING

OFFICIAL DECISION MEMORANDUM
Ref: PRGI/MEMO/${caseData.id}/${new Date().getFullYear()}
Date of Review: ${timestamp}

1. APPLICATION DETAILS
Applicant Name: ${caseData.applicantName}
Proposed Title: ${caseData.proposedTitle}
State of Publication: ${caseData.state}
Language: ${caseData.language}
Periodicity: ${caseData.periodicity}

2. STATUTORY CONFLICT EVALUATION
Risk Assessment Index: ${caseData.riskScore}%
Adjudicated Verdict: ${caseData.verdict}
Primary Conflict Finding: ${caseData.primaryConflict || 'No blocking statutory conflict identified.'}

3. OFFICER DISCRETIONARY REMARKS & DISPOSITION
${caseData.copilotDecisionNote || 'The title application has undergone automated phonetic, lexical, and semantic verification against the national master title registry. Recommended for statutory clearance subject to standard verification protocols.'}

--------------------------------------------------
Adjudicating Officer: DARSH_DESK_OFFICER_01
PRGI Digital Title Verification Division, New Delhi`;
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
