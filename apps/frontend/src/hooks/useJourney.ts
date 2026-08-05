"use client";

import { useState, useCallback } from "react";
import { JourneyApi } from "../services/api/journey.api";
import { JourneyPlan } from "../models/journey";

export function useJourney(activeCity: string) {
  const [data, setData] = useState<JourneyPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const planJourney = useCallback(
    async (from: string, to: string, mode: "metro" | "multimodal") => {
      setLoading(true);
      setError(null);
      const res = await JourneyApi.planJourney(from, to, activeCity, mode);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error);
      }
      setLoading(false);
    },
    [activeCity]
  );

  return { data, loading, error, planJourney };
}
