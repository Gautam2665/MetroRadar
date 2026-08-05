"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface StationContextType {
  selectedStationId: string | null;
  selectedStationName: string;
  setSelectedStation: (id: string | null, name?: string) => void;
  clearSelectedStation: () => void;
}

const StationContext = createContext<StationContextType>({
  selectedStationId: null,
  selectedStationName: "",
  setSelectedStation: () => {},
  clearSelectedStation: () => {},
});

export function StationProvider({ children }: { children: ReactNode }) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedStationName, setSelectedStationName] = useState<string>("");

  const setSelectedStation = (id: string | null, name: string = "Station") => {
    setSelectedStationId(id);
    setSelectedStationName(name);
  };

  const clearSelectedStation = () => {
    setSelectedStationId(null);
    setSelectedStationName("");
  };

  return (
    <StationContext.Provider
      value={{
        selectedStationId,
        selectedStationName,
        setSelectedStation,
        clearSelectedStation,
      }}
    >
      {children}
    </StationContext.Provider>
  );
}

export function useStationContext() {
  return useContext(StationContext);
}
