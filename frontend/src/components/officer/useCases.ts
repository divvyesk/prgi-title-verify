import { useState, useEffect, useCallback } from 'react';
import type { OfficerCase } from '../../types';
import fixtureCasesRaw from '../../data/officer_cases.json';

export interface UseCasesResult {
  cases: OfficerCase[];
  isLoading: boolean;
  error: string | null;
  source: 'LIVE' | 'FIXTURE';
  updateCaseStatus: (id: string, newStatus: OfficerCase['status'], note?: string) => void;
  updateCaseNote: (id: string, note: string) => void;
  reloadCases: () => Promise<void>;
}

const fixtureCases = fixtureCasesRaw as OfficerCase[];

export const useCases = (): UseCasesResult => {
  const [cases, setCases] = useState<OfficerCase[]>(fixtureCases);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'LIVE' | 'FIXTURE'>('FIXTURE');

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
        // Fallback if data format unexpected
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

  return {
    cases,
    isLoading,
    error,
    source,
    updateCaseStatus,
    updateCaseNote,
    reloadCases: fetchCases
  };
};
