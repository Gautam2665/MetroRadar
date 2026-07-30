"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import maplibregl from "maplibre-gl";
import Sidebar from "@/components/dashboard/Sidebar";
import MapContainer from "@/components/map/MapContainer";
import DigitalTwinInspector from "@/components/dashboard/DigitalTwinInspector";
import DiagnosticsHud from "@/components/dashboard/DiagnosticsHud";
import DeveloperDashboard from "@/components/dashboard/DeveloperDashboard";

export default function Home() {
  // Map Viewport state
  const [activeCity, setActiveCity] = useState("delhi");
  const [mapViewport, setMapViewport] = useState<{
    center: [number, number];
    zoom: number;
  }>({
    center: [77.228, 28.667], // Delhi center
    zoom: 12,
  });

  // Selection & Layer states
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [activeLayers, setActiveLayers] = useState<string[]>(["lines", "stations", "realtime"]);
  const [loadedLayersCount, setLoadedLayersCount] = useState(0);

  // Diagnostics & Dev states
  const [appMode, setAppMode] = useState<"passenger" | "developer">("passenger");
  const [developerConsoleOpen, setDeveloperConsoleOpen] = useState(false);
  const [apiLatency, setApiLatency] = useState(0);
  const [cacheHit, setCacheHit] = useState(false);

  // Journey Intelligence state
  const [journeyGeojson, setJourneyGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  // Map Instance Ref
  const mapRef = useRef<maplibregl.Map | null>(null);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

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

  const handleTrackEntrance = (lat: number, lon: number) => {
    handleFlyTo([lon, lat], 17);
  };

  const handleJourneyResult = (result: { journey?: { geojson?: GeoJSON.FeatureCollection } } | null) => {
    setJourneyGeojson(result?.journey?.geojson ?? null);
  };

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#09090b]">
      {/* 1. Sidebar Panel (Left) */}
      <Sidebar
        activeCity={activeCity}
        onCityChange={(cityCode, center, zoom) => {
          setActiveCity(cityCode);
          handleFlyTo(center, zoom);
        }}
        selectedStationId={selectedStationId}
        onStationSelect={setSelectedStationId}
        activeLayers={activeLayers}
        onToggleLayer={handleToggleLayer}
        loadedLayersCount={loadedLayersCount}
        onFlyToCoordinates={handleFlyTo}
        onJourneyResult={handleJourneyResult}
        apiLatency={apiLatency}
        cacheHit={cacheHit}
        apiLatencySetter={updateApiLatency}
        onToggleDevConsole={() => setDeveloperConsoleOpen(true)}
        onModeChange={setAppMode}
      />

      {/* 2. Interactive Map Container (Center/Right) */}
      <MapContainer
        center={mapViewport.center}
        zoom={mapViewport.zoom}
        activeLayers={activeLayers}
        activeCity={activeCity}
        selectedStationId={selectedStationId}
        onStationSelect={setSelectedStationId}
        onViewportChange={(c, z) => setMapViewport({ center: c, zoom: z })}
        apiLatencySetter={updateApiLatency}
        setLoadedLayersCount={setLoadedLayersCount}
        mapRef={mapRef}
        journeyGeojson={journeyGeojson}
      />



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
      {appMode === "developer" && (
        <DiagnosticsHud
          zoom={mapViewport.zoom}
          center={mapViewport.center}
          loadedLayersCount={loadedLayersCount}
          apiLatency={apiLatency}
          cacheHit={cacheHit}
        />
      )}

      {/* 5. Developer & Diagnostics Admin Console */}
      {appMode === "developer" && developerConsoleOpen && (
        <DeveloperDashboard onClose={() => setDeveloperConsoleOpen(false)} />
      )}
    </div>
  );
}
