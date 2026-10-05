"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { JourneyPlannerContainer, RouteOption } from "../../containers/JourneyPlannerContainer";
import { useCityContext } from "../../contexts/CityContext";

export default function JourneyPlannerPage() {
  const { activeCity, setActiveCity } = useCityContext();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [routeGeojson, setRouteGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [allCandidates, setAllCandidates] = useState<RouteOption[]>([]);
  const [originStation, setOriginStation] = useState<{ id: string; name: string } | null>(null);
  const [destStation, setDestStation] = useState<{ id: string; name: string } | null>(null);

  const handleGeojsonUpdate = useCallback((geojson: GeoJSON.FeatureCollection | Record<string, unknown>) => {
    setRouteGeojson(geojson as GeoJSON.FeatureCollection);
  }, []);

  const handleRouteFound = useCallback((route: RouteOption) => {
    setActiveRoute(route);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] h-full overflow-hidden">
        <Header
          activeCity={activeCity}
          onCityChange={(city) => {
            setActiveCity(city);
            setActiveRoute(null);
            setAllCandidates([]);
            setRouteGeojson(null);
            setOriginStation(null);
            setDestStation(null);
          }}
        />

        {/* Main content — full height split matching Stitch layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

          {/* ── LEFT PANEL: 420px Fixed Stitch Design ───────────────── */}
          <div className="w-full lg:w-[420px] lg:min-w-[420px] flex-shrink-0 flex flex-col h-full bg-[#0b0f17] border-r border-white/8 overflow-hidden z-20 shadow-[8px_0_32px_rgba(0,0,0,0.5)]">
            <JourneyPlannerContainer
              activeCity={activeCity}
              onGeojsonUpdate={handleGeojsonUpdate}
              onRouteFound={handleRouteFound}
              onActiveRouteChange={setActiveRoute}
              onCandidatesChange={setAllCandidates}
              selectedOriginStation={originStation}
              selectedDestStation={destStation}
            />
          </div>

          {/* ── RIGHT PANEL: Interactive Digital Twin Map ───────────── */}
          <div className="flex-1 relative bg-[#0a0e14] overflow-hidden">
            <MapContainer
              activeCity={activeCity}
              activeLayers={["lines", "stations"]}
              selectedStationId={selectedStationId}
              journeyGeojson={routeGeojson}
              selectedCandidate={activeRoute}
              selectedCandidateId={activeRoute?.id || null}
              candidates={allCandidates}
              onStationSelect={(id) => setSelectedStationId(id)}
              onSelectStation={(station) => {
                setSelectedStationId(station.id);
              }}
              onSetOrigin={(st) => setOriginStation(st)}
              onSetDestination={(st) => setDestStation(st)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
