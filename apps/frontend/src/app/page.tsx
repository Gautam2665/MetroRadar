"use client";

import { useState, useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import Sidebar, { CityConfig } from "@/components/dashboard/Sidebar";
import MapContainer from "@/components/map/MapContainer";
import DigitalTwinInspector from "@/components/dashboard/DigitalTwinInspector";
import DiagnosticsHud from "@/components/dashboard/DiagnosticsHud";
import DeveloperDashboard from "@/components/dashboard/DeveloperDashboard";
import JourneyPlanner from "@/components/dashboard/JourneyPlanner";

export default function Home() {
  // Map Viewport state
  const [activeCity, setActiveCity] = useState<CityConfig>({
    name: "Delhi Metro",
    code: "delhi",
    center: [77.209, 28.6139],
    zoom: 11.5,
  });

  const [mapViewport, setMapViewport] = useState<{
    center: [number, number];
    zoom: number;
  }>({
    center: [77.209, 28.6139],
    zoom: 11.5,
  });

  // Selection & Layer states
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>(["lines", "stations"]);
  const [loadedLayersCount, setLoadedLayersCount] = useState(0);

  // Diagnostics & Dev states
  const [developerConsoleOpen, setDeveloperConsoleOpen] = useState(false);
  const [apiLatency, setApiLatency] = useState(0);
  const [cacheHit, setCacheHit] = useState(false);

  // Journey Intelligence state
  const [journeyGeojson, setJourneyGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  // Map Instance Ref
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex w-screen h-screen items-center justify-center bg-[#09090b]">
        <div className="text-center space-y-3">
          <div className="h-6 w-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-mono tracking-wider uppercase">Initializing digital twin dashboard...</p>
        </div>
      </div>
    );
  }

  // Keep track of cache hit status based on request duration patterns (e.g. < 25ms usually indicates Redis hit)
  const updateApiLatency = (ms: number) => {
    setApiLatency(ms);
    setCacheHit(ms < 25);
  };

  const handleFlyTo = (coords: [number, number], customZoom?: number) => {
    setMapViewport({
      center: coords,
      zoom: customZoom || 13,
    });
  };

  const handleToggleLayer = (layerId: string) => {
    setActiveLayers((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    );
  };

  const handleTrackEntrance = (lat: number, lon: number, _name: string) => {
    handleFlyTo([lon, lat], 17);
  };

  const handleJourneyResult = (result: any) => {
    setJourneyGeojson(result?.journey?.geojson ?? null);
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#09090b]">
      {/* 1. Sidebar Panel (Left) */}
      <Sidebar
        activeCity={activeCity}
        onCityChange={setActiveCity}
        onStationSelect={setSelectedStationId}
        activeLayers={activeLayers}
        onToggleLayer={handleToggleLayer}
        onDeveloperConsoleOpen={() => setDeveloperConsoleOpen(true)}
        onFlyToCoordinates={handleFlyTo}
        apiLatencySetter={updateApiLatency}
      />

      {/* 2. Interactive Map Container (Center/Right) */}
      <MapContainer
        center={mapViewport.center}
        zoom={mapViewport.zoom}
        activeLayers={activeLayers}
        selectedStationId={selectedStationId}
        onStationSelect={setSelectedStationId}
        onViewportChange={(c, z) => setMapViewport({ center: c, zoom: z })}
        apiLatencySetter={updateApiLatency}
        setLoadedLayersCount={setLoadedLayersCount}
        mapRef={mapRef}
        journeyGeojson={journeyGeojson}
      />

      {/* 3. Floating Journey Planner Overlay */}
      <div className="absolute top-4 left-[404px] z-10 w-[380px] bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        <JourneyPlanner
          onJourneyResult={handleJourneyResult}
          onFlyToCoordinates={handleFlyTo}
        />
      </div>

      {/* 3. Station Digital Twin Inspector Drawer (Collapsible Right) */}
      {selectedStationId && (
        <div className="w-[450px] bg-zinc-900 border-l border-zinc-800/80 backdrop-blur-md flex flex-col h-full shadow-2xl relative z-10 transition-all duration-300 animate-slide-in">
          <DigitalTwinInspector
            stationId={selectedStationId}
            onClose={() => setSelectedStationId(null)}
            onTrackEntrance={handleTrackEntrance}
          />
        </div>
      )}

      {/* 4. Diagnostics HUD Overlay (Ctrl+Shift+D) */}
      <DiagnosticsHud
        zoom={mapViewport.zoom}
        center={mapViewport.center}
        loadedLayersCount={loadedLayersCount}
        apiLatency={apiLatency}
        cacheHit={cacheHit}
      />

      {/* 5. Developer & Diagnostics Admin Console */}
      {developerConsoleOpen && (
        <DeveloperDashboard onClose={() => setDeveloperConsoleOpen(false)} />
      )}
    </div>
  );
}
