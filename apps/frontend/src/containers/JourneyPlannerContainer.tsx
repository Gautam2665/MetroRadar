"use client";

import { useState, useEffect } from "react";
import { JourneyPlannerView, RouteOption } from "../components/ui/JourneyPlannerView";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

const DEFAULT_STATIONS: Record<string, { origin: string; dest: string }> = {
  delhi: { origin: "Kashmere Gate", dest: "HUDA City Centre" },
  kochi: { origin: "Aluva", dest: "SN Junction" },
  hyderabad: { origin: "Raidurg", dest: "Secunderabad" },
  bengaluru: { origin: "Nadaprabhu Kempegowda (Majestic)", dest: "Whitefield" },
  chennai: { origin: "Chennai Central", dest: "Airport" },
  ahmedabad: { origin: "Old High Court", dest: "Motera Stadium" },
};

interface JourneyPlannerContainerProps {
  activeCity: string;
  onGeojsonUpdate?: (geojson: any) => void;
}

export function JourneyPlannerContainer({ activeCity, onGeojsonUpdate }: JourneyPlannerContainerProps) {
  const cityDefaults = DEFAULT_STATIONS[activeCity.toLowerCase()] || DEFAULT_STATIONS.delhi;

  const [origin, setOrigin] = useState(cityDefaults.origin);
  const [destination, setDestination] = useState(cityDefaults.dest);
  const [selectedMode, setSelectedMode] = useState<"metro" | "multimodal">("metro");
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([
    {
      id: "route-1",
      duration: "32 min",
      fare: "₹30",
      smartCardFare: "₹27",
      distance: "18.6 km",
      interchanges: 2,
      walkDistance: "1.2 km",
      crowd: "Low",
      crowdColor: "#4ade80",
      boardCoach: "Coach 3",
      score: 96,
      legs: [
        { mode: "subway", line: "Red Line", color: "#EF4444" },
        { mode: "subway", line: "Violet Line", color: "#8B5CF6" },
        { mode: "subway", line: "Yellow Line", color: "#EAB308" },
      ],
    },
    {
      id: "route-2",
      duration: "28 min",
      fare: "₹30",
      smartCardFare: "₹27",
      distance: "17.9 km",
      interchanges: 1,
      walkDistance: "900 m",
      crowd: "Medium",
      crowdColor: "#fec931",
      boardCoach: "Coach 2",
      score: 92,
      legs: [
        { mode: "subway", line: "Red Line", color: "#EF4444" },
        { mode: "subway", line: "Yellow Line", color: "#EAB308" },
      ],
    },
  ]);

  // Sync defaults on city change
  useEffect(() => {
    const defaults = DEFAULT_STATIONS[activeCity.toLowerCase()] || DEFAULT_STATIONS.delhi;
    setOrigin(defaults.origin);
    setDestination(defaults.dest);
  }, [activeCity]);

  // Fetch pathfinder routes from NestJS backend
  const handleSearchRoute = async () => {
    if (!origin || !destination) return;
    setLoading(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/journeys?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}&system=${activeCity}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.journey) {
          if (onGeojsonUpdate && data.journey.geojson) {
            onGeojsonUpdate(data.journey.geojson);
          }
          const dynamicRoute: RouteOption = {
            id: `nest-${Date.now()}`,
            duration: `${data.journey.duration || 32} min`,
            fare: selectedMode === "multimodal" ? "Cab: ₹140 • Auto: ₹85" : "₹30",
            smartCardFare: "₹27",
            distance: "18.4 km",
            interchanges: selectedMode === "multimodal" ? 0 : (data.journey.transfers || 2),
            walkDistance: selectedMode === "multimodal" ? "0 m" : "1.1 km",
            crowd: "Low",
            crowdColor: "#4ade80",
            boardCoach: "Coach 3",
            score: data.journey.score || 96,
            legs: [
              { mode: selectedMode === "multimodal" ? "walk" : "subway", line: selectedMode === "multimodal" ? "Cab/Auto Direct" : "Metro Line 1", color: "#00e5ff" },
            ],
          };
          setRoutes([dynamicRoute]);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("NestJS Pathfinder API notice, using fallback payload:", err);
    }

    // Fallback payload with dynamic properties
    const calculatedRoute: RouteOption = {
      id: `calc-${Date.now()}`,
      duration: selectedMode === "multimodal" ? "26 min" : "32 min",
      fare: "₹30",
      smartCardFare: "₹27",
      distance: "18.6 km",
      interchanges: selectedMode === "multimodal" ? 0 : 1,
      walkDistance: selectedMode === "multimodal" ? "0 m" : "900 m",
      crowd: "Low",
      crowdColor: "#4ade80",
      boardCoach: "Coach 3",
      score: selectedMode === "multimodal" ? 98 : 95,
      legs: selectedMode === "multimodal"
        ? [{ mode: "walk", line: "Direct Cab/Auto Shuttle", color: "#00e5ff" }]
        : [
            { mode: "subway", line: "Primary Metro Line", color: "#00e5ff" },
            { mode: "subway", line: "Connecting Line", color: "#EAB308" },
          ],
    };

    setRoutes([calculatedRoute]);
    setLoading(false);
  };

  const handleSwap = () => {
    const tmp = origin;
    setOrigin(destination);
    setDestination(tmp);
  };

  return (
    <JourneyPlannerView
      activeCity={activeCity}
      origin={origin}
      destination={destination}
      selectedMode={selectedMode}
      activeRouteIndex={activeRouteIndex}
      routes={routes}
      loading={loading}
      onOriginChange={(val) => setOrigin(val)}
      onDestinationChange={(val) => setDestination(val)}
      onSwap={handleSwap}
      onModeSelect={(mode) => setSelectedMode(mode)}
      onRouteSelect={(idx) => setActiveRouteIndex(idx)}
      onSearchRoute={handleSearchRoute}
    />
  );
}
