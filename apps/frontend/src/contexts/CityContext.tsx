"use client";

import { createContext, useContext, useState, ReactNode } from "react";

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
  const [activeCity, setActiveCityState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
      } catch {}
    }
    return "delhi";
  });

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
