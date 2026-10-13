"use client";

import { useState, useEffect } from "react";
import { StationApi } from "../services/api/station.api";
import { DigitalTwin } from "../models/digitalTwin";

const digitalTwinCache = new Map<string, DigitalTwin>();

export function useDigitalTwin(stationId: string | null, defaultName: string = "Station") {
  const [data, setData] = useState<DigitalTwin | null>(() => {
    if (stationId && digitalTwinCache.has(stationId)) {
      return digitalTwinCache.get(stationId)!;
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(!stationId || !digitalTwinCache.has(stationId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stationId) {
      setData(null);
      return;
    }

    let isSubscribed = true;

    // If cache exists, hydrate immediately so UI is instant
    if (digitalTwinCache.has(stationId)) {
      setData(digitalTwinCache.get(stationId)!);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchTwin = () => {
      StationApi.getDigitalTwin(stationId, defaultName).then((res) => {
        if (!isSubscribed) return;
        if (res.success) {
          digitalTwinCache.set(stationId, res.data);
          setData(res.data);
          setError(null);
        } else if (!digitalTwinCache.has(stationId)) {
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
