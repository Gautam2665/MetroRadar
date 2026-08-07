"use client";

import { useState, useEffect, useCallback } from "react";
import { StationApi } from "../services/api/station.api";
import { DigitalTwin } from "../models/digitalTwin";

const digitalTwinCache = new Map<string, DigitalTwin>();

export function useDigitalTwin(stationId: string | null, defaultName: string = "Station") {
  const [data, setData] = useState<DigitalTwin | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTwin = useCallback(async () => {
    if (!stationId) {
      setData(null);
      return;
    }

    if (digitalTwinCache.has(stationId)) {
      setData(digitalTwinCache.get(stationId)!);
      return;
    }

    setLoading(true);
    setError(null);
    const res = await StationApi.getDigitalTwin(stationId, defaultName);
    if (res.success) {
      digitalTwinCache.set(stationId, res.data);
      setData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [stationId, defaultName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTwin();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTwin]);

  return { data, loading, error, refresh: fetchTwin };
}
