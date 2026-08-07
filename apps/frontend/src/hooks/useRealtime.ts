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
    const timer = setTimeout(() => {
      void fetchRealtime();
    }, 0);
    const interval = setInterval(() => {
      void fetchRealtime();
    }, pollIntervalMs);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchRealtime, pollIntervalMs]);

  return { data, loading, error, refresh: fetchRealtime };
}
