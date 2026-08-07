"use client";

import { useState, useCallback, useRef } from "react";
import { StationApi, StationSearchResult } from "../services/api/station.api";

const searchCache = new Map<string, StationSearchResult[]>();

/**
 * useStationsSearch — debounced, cached station search hook
 *
 * Features:
 * - 350ms debounce
 * - Minimum 2 characters before querying
 * - In-memory cache keyed by `query:city`
 * - Exposes { results, loading, error, search, clear }
 */
export function useStationsSearch(activeCity?: string) {
  const [results, setResults] = useState<StationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const latestQueryRef = useRef<string>("");

  const search = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!query || query.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      const cacheKey = `${query.trim().toLowerCase()}:${activeCity || ""}`;
      if (searchCache.has(cacheKey)) {
        setResults(searchCache.get(cacheKey)!);
        setLoading(false);
        return;
      }

      setLoading(true);
      latestQueryRef.current = query;

      debounceRef.current = setTimeout(async () => {
        // Guard against stale responses
        if (latestQueryRef.current !== query) return;

        setError(null);
        const res = await StationApi.searchStations(query, activeCity);
        if (res.success) {
          searchCache.set(cacheKey, res.data);
          if (latestQueryRef.current === query) {
            setResults(res.data);
          }
        } else {
          setError(res.error);
          setResults([]);
        }
        setLoading(false);
      }, 350);
    },
    [activeCity]
  );

  const clear = useCallback(() => {
    setResults([]);
    setLoading(false);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { results, loading, error, search, clear };
}
