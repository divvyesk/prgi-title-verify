import { useState, useEffect, useRef, useCallback } from 'react';
import type { TitleRecord } from '../../types';
import sampleTitlesRaw from '../../data/titleMasterSample.json';

const sampleTitles = sampleTitlesRaw as unknown as TitleRecord[];

export interface RegistrySearchParams {
  query: string;
  state: string;
  language: string;
  periodicity: string;
  page: number;
  size: number;
}

export interface UseRegistrySearchResult {
  records: TitleRecord[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  mode: 'LIVE' | 'OFFLINE';
  languages: string[];
  states: string[];
  periodicities: string[];
  refetch: () => void;
}

export const useRegistrySearch = (params: RegistrySearchParams): UseRegistrySearchResult => {
  const { query, state, language, periodicity, page, size } = params;

  // Initialize with the first 50 sample titles so the screen is NEVER blank
  const [records, setRecords] = useState<TitleRecord[]>(() => sampleTitles.slice(0, size || 50));
  const [total, setTotal] = useState<number>(() => sampleTitles.length);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'LIVE' | 'OFFLINE'>('OFFLINE');

  // Debounced query ref to track active request
  const abortControllerRef = useRef<AbortController | null>(null);

  // Extract unique filter choices from base sample
  const languages = useRef<string[]>(
    Array.from(new Set(sampleTitles.map((t: any) => (t.language ? t.language.split(',')[0].trim() : ''))))
      .filter(Boolean)
      .sort()
  ).current;

  const states = useRef<string[]>(
    Array.from(new Set(sampleTitles.map((t: any) => (t.state || t.publication_state ? (t.state || t.publication_state).trim() : ''))))
      .filter(Boolean)
      .sort()
  ).current;

  const periodicities = useRef<string[]>(
    Array.from(new Set(sampleTitles.map((t: any) => (t.periodicity ? t.periodicity.trim() : ''))))
      .filter(Boolean)
      .sort()
  ).current;

  // Offline client-side search fallback
  const performOfflineSearch = useCallback(() => {
    const q = query.toLowerCase().trim();
    const filtered = sampleTitles.filter((item: any) => {
      const title = item.title || '';
      const reg = item.regNo || item.registration_number || item.id || '';
      const pub = item.publisher || item.owner || '';
      const lang = item.language || '';
      const st = item.state || item.publication_state || '';
      const per = item.periodicity || '';

      const matchesSearch =
        !q ||
        title.toLowerCase().includes(q) ||
        reg.toLowerCase().includes(q) ||
        pub.toLowerCase().includes(q);

      const matchesLang =
        language === 'ALL' || lang.includes(language);

      const matchesState =
        state === 'ALL' || st === state;

      const matchesPeriodicity =
        periodicity === 'ALL' || per === periodicity;

      return matchesSearch && matchesLang && matchesState && matchesPeriodicity;
    });

    const start = (page - 1) * size;
    const paginated = filtered.slice(start, start + size);

    setRecords(paginated);
    setTotal(filtered.length);
    setMode('OFFLINE');
    setIsLoading(false);
  }, [query, state, language, periodicity, page, size]);

  const fetchRegistry = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Cancel in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Build search query parameters
      const urlParams = new URLSearchParams();
      if (query.trim()) urlParams.set('q', query.trim());
      if (state !== 'ALL') urlParams.set('state', state);
      if (language !== 'ALL') urlParams.set('language', language);
      if (periodicity !== 'ALL') urlParams.set('periodicity', periodicity);
      urlParams.set('page', String(page));
      urlParams.set('size', String(size));

      let response: Response | null = null;
      
      // 1. Try Vite proxy route
      try {
        response = await fetch(`/api/v1/registry/search?${urlParams.toString()}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
      } catch {
        // Fallback to direct port 8000
        response = await fetch(`http://127.0.0.1:8000/v1/registry/search?${urlParams.toString()}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP error: ${response?.statusText || 'failed'}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        setRecords(data.results);
        setTotal(typeof data.total === 'number' ? data.total : data.results.length);
        setMode('LIVE');
        setIsLoading(false);
      } else {
        performOfflineSearch();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was aborted due to new input
      }
      const msg = err instanceof Error ? err.message : 'Server unreachable';
      setError(msg);
      performOfflineSearch();
    }
  }, [query, state, language, periodicity, page, size, performOfflineSearch]);

  useEffect(() => {
    fetchRegistry();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRegistry]);

  const totalPages = Math.ceil(total / size) || 1;

  return {
    records,
    total,
    totalPages,
    isLoading,
    error,
    mode,
    languages,
    states,
    periodicities,
    refetch: fetchRegistry
  };
};
