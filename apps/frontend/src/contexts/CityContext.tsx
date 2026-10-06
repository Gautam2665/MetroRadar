"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface CityContextType {
  activeCity: string;
  setActiveCity: (city: string) => void;
}

const CityContext = createContext<CityContextType>({
  activeCity: "delhi",
  setActiveCity: () => {},
});

const STORAGE_KEY = "transitos_active_city";

export function CityProvider({ children }: { children: ReactNode }) {
  // Keep the first server and browser render identical. Restore the saved city
  // after hydration so localStorage cannot change the initial HTML.
  const [activeCity, setActiveCityState] = useState<string>("delhi");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setActiveCityState(stored);
    } catch {
      // Storage may be unavailable; the default city remains usable.
    }
  }, []);

  const setActiveCity = (city: string) => {
    setActiveCityState(city);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, city);
      } catch {}
    }
  };

  return (
    <CityContext.Provider value={{ activeCity, setActiveCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCityContext() {
  return useContext(CityContext);
}
