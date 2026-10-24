"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AnalyticsApi,
  DatasetAuditReport,
  PedestrianNetworkGeoJson,
  StationCatchmentResult,
} from "../services/api/analytics.api";

export function useStationCatchment(
  stationId: string | null,
  minutes: number[] = [5, 10]
) {
  const [data, setData] = useState<StationCatchmentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const minutesKey = useMemo(() => minutes.join(","), [minutes]);

  const fetchCatchment = useCallback(async () => {
    if (!stationId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    const parsedMinutes = minutesKey.split(",").map(Number);
    const res = await AnalyticsApi.getStationCatchment(stationId, parsedMinutes);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [stationId, minutesKey]);

  useEffect(() => {
    fetchCatchment();
  }, [fetchCatchment]);

  return { data, loading, error, refresh: fetchCatchment };
}

export function usePedestrianNetwork() {
  const [data, setData] = useState<PedestrianNetworkGeoJson | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNetwork = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await AnalyticsApi.getPedestrianNetwork();
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  return { data, loading, error, refresh: fetchNetwork };
}

export function useDatasetAudit() {
  const [data, setData] = useState<DatasetAuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await AnalyticsApi.getDatasetAudit();
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  return { data, loading, error, refresh: fetchAudit };
}
