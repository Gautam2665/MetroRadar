"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, ReactNode } from "react";

interface CityContextType {
  activeCity: string;
  setActiveCity: (city: string) => void;
}

const DEFAULT_CITY = "mumbai";

const CityContext = createContext<CityContextType>({
  activeCity: DEFAULT_CITY,
  setActiveCity: () => undefined,
});

const STORAGE_KEY = "transitos_active_city";
const citySubscribers = new Set<() => void>();
let inMemoryCity = DEFAULT_CITY;
let hasLoadedStoredCity = false;

function getActiveCitySnapshot(): string {
  if (hasLoadedStoredCity) return inMemoryCity;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) inMemoryCity = stored;
  } catch {
    // Fall back to the stable in-memory default when storage is unavailable.
  }
  hasLoadedStoredCity = true;
  return inMemoryCity;
}

function getServerCitySnapshot(): string {
  return DEFAULT_CITY;
}

function notifyCitySubscribers(): void {
  citySubscribers.forEach((notify) => notify());
}

function subscribeToCityChanges(notify: () => void): () => void {
  citySubscribers.add(notify);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    inMemoryCity = event.newValue || DEFAULT_CITY;
    hasLoadedStoredCity = true;
    notifyCitySubscribers();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    citySubscribers.delete(notify);
    window.removeEventListener("storage", handleStorage);
  };
}

export function CityProvider({ children }: { children: ReactNode }) {
  const activeCity = useSyncExternalStore(
    subscribeToCityChanges,
    getActiveCitySnapshot,
    getServerCitySnapshot,
  );
  const setActiveCity = useCallback((city: string) => {
    inMemoryCity = city;
    hasLoadedStoredCity = true;
    try {
      localStorage.setItem(STORAGE_KEY, city);
    } catch {
      // The in-memory value still updates when browser storage is unavailable.
    }
    notifyCitySubscribers();
  }, []);
  const value = useMemo(() => ({ activeCity, setActiveCity }), [activeCity, setActiveCity]);

  return (
    <CityContext.Provider value={value}>
      {children}
    </CityContext.Provider>
  );
}

export function useCityContext() {
  return useContext(CityContext);
}
