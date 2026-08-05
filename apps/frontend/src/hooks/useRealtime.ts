"use client";

import { useState, useEffect, useCallback } from "react";
import { RealtimeApi } from "../services/api/realtime.api";
import { RealtimeVehicle } from "../models/vehicle";

export function useRealtime(activeCity: string, pollIntervalMs: number = 5000) {
  const [data, setData] = useState<RealtimeVehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRealtime = useCallback(async () => {
    const res = await RealtimeApi.getRealtimeVehicles(activeCity);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [activeCity]);

  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchRealtime, pollIntervalMs]);

  return { data, loading, error, refresh: fetchRealtime };
}
