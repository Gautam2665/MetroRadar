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

export function CityProvider({ children }: { children: ReactNode }) {
  const [activeCity, setActiveCity] = useState("delhi");
  return (
    <CityContext.Provider value={{ activeCity, setActiveCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCityContext() {
  return useContext(CityContext);
}
