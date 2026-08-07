"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { StationItem } from "../components/StationSearchInput";

interface JourneyContextType {
  /** UUID of the origin station, or null */
  originId: string | null;
  /** Display name */
  originName: string;
  /** UUID of the destination station, or null */
  destinationId: string | null;
  /** Display name */
  destinationName: string;
  /** GeoJSON FeatureCollection from the last successful pathfinder call */
  journeyGeojson: Record<string, unknown> | null;
  setOrigin: (station: StationItem | null) => void;
  setDestination: (station: StationItem | null) => void;
  setJourneyGeojson: (geojson: Record<string, unknown> | null) => void;
  clearJourney: () => void;
}

const JourneyContext = createContext<JourneyContextType>({
  originId: null,
  originName: "",
  destinationId: null,
  destinationName: "",
  journeyGeojson: null,
  setOrigin: () => {},
  setDestination: () => {},
  setJourneyGeojson: () => {},
  clearJourney: () => {},
});

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [originId, setOriginId] = useState<string | null>(null);
  const [originName, setOriginName] = useState("");
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [destinationName, setDestinationName] = useState("");
  const [journeyGeojson, setJourneyGeojsonState] = useState<Record<string, unknown> | null>(null);

  const setOrigin = (station: StationItem | null) => {
    setOriginId(station?.id ?? null);
    setOriginName(station?.name ?? "");
  };

  const setDestination = (station: StationItem | null) => {
    setDestinationId(station?.id ?? null);
    setDestinationName(station?.name ?? "");
  };

  const setJourneyGeojson = (geojson: Record<string, unknown> | null) => {
    setJourneyGeojsonState(geojson);
  };

  const clearJourney = () => {
    setOriginId(null);
    setOriginName("");
    setDestinationId(null);
    setDestinationName("");
    setJourneyGeojsonState(null);
  };

  return (
    <JourneyContext.Provider
      value={{
        originId,
        originName,
        destinationId,
        destinationName,
        journeyGeojson,
        setOrigin,
        setDestination,
        setJourneyGeojson,
        clearJourney,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourneyContext() {
  return useContext(JourneyContext);
}
