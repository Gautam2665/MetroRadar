"use client";

import { useState, useEffect } from "react";
import { StationApi } from "../services/api/station.api";
import { DigitalTwin } from "../models/digitalTwin";

interface CacheEntry {
  data: DigitalTwin;
  cachedAt: number;
}

const digitalTwinCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5000; // 5 seconds freshness

function getValidCache(stationId: string): DigitalTwin | null {
  const entry = digitalTwinCache.get(stationId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    digitalTwinCache.delete(stationId);
    return null;
  }
  return entry.data;
}

export function useDigitalTwin(stationId: string | null, defaultName: string = "Station") {
  const [data, setData] = useState<DigitalTwin | null>(() => {
    if (stationId) {
      return getValidCache(stationId);
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(!stationId || !getValidCache(stationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) {
      setData(null);
      return;
    }

    let isSubscribed = true;

    // If cache exists and is fresh, hydrate immediately so UI is instant
    const cached = getValidCache(stationId);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchTwin = () => {
      StationApi.getDigitalTwin(stationId, defaultName).then((res) => {
        if (!isSubscribed) return;
        if (res.success) {
          digitalTwinCache.set(stationId, { data: res.data, cachedAt: Date.now() });
          setData(res.data);
          setError(null);
        } else if (!getValidCache(stationId)) {
          setError(res.error);
        }
        setLoading(false);
      });
    };

    // Initial fetch to get latest live ETAs
    fetchTwin();

    // Poll every 5 seconds dynamically while the station inspector is open
    const intervalId = setInterval(fetchTwin, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [stationId, defaultName]);

  return { data, loading, error };
}
