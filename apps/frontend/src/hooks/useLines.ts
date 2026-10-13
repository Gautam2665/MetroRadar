"use client";

import { useState, useEffect } from "react";
import { StationApi, MetroLineDto } from "../services/api/station.api";

export function useLines(activeCity?: string) {
  const [lines, setLines] = useState<MetroLineDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    StationApi.getLines()
      .then((res) => {
        if (!isSubscribed) return;
        if (res.success) {
          let list = res.data;
          if (activeCity) {
            const cityLower = activeCity.toLowerCase().trim();
            list = list.filter((l) => {
              const code = (l.code || "").toUpperCase();
              const name = (l.name || "").toLowerCase();
              const sysMatch = l.systemId && l.systemId.toLowerCase().includes(cityLower);
              const mumbaiMatch =
                cityLower === "mumbai" &&
                (code.startsWith("LINE") ||
                  code === "MONORAIL" ||
                  name.includes("mumbai") ||
                  l.systemId === "004a04d4-f3d7-40c2-8714-9e6ea751a55e" ||
                  l.systemId?.toLowerCase().includes("mm") ||
                  !l.systemId);
              return sysMatch || mumbaiMatch;
            });
          }
          setLines(list);
          setError(null);
        } else {
          setError(res.error || "Failed to load metro lines");
        }
      })
      .catch((err) => {
        if (!isSubscribed) return;
        setError(err.message || "Failed to load metro lines");
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeCity]);

  return { lines, loading, error };
}

