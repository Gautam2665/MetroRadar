"use client";

import { useState, useEffect, useCallback } from "react";
import { StationApi } from "../services/api/station.api";
import { Station } from "../models/station";

export function useStations(activeCity: string) {
  const [data, setData] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await StationApi.getStations(activeCity);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [activeCity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchStations();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStations]);

  return { data, loading, error, refresh: fetchStations };
}
