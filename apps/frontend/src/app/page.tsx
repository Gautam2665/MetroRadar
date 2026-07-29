"use client";

import { useState, useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import Sidebar, { CityConfig } from "@/components/dashboard/Sidebar";
import MapContainer from "@/components/map/MapContainer";
import DigitalTwinInspector from "@/components/dashboard/DigitalTwinInspector";
import DiagnosticsHud from "@/components/dashboard/DiagnosticsHud";
import DeveloperDashboard from "@/components/dashboard/DeveloperDashboard";
import MobileViewSwitcher from "@/components/mobile/MobileViewSwitcher";

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
  const [selectedStationId, setSelectedStationId] = useState<string | null>("kashmere-gate");
  const [activeLayers, setActiveLayers] = useState<string[]>(["lines", "stations"]);
  const [loadedLayersCount, setLoadedLayersCount] = useState(0);

  // Diagnostics & Dev states
  const [appMode, setAppMode] = useState<"passenger" | "developer">("passenger");
  const [developerConsoleOpen, setDeveloperConsoleOpen] = useState(false);
  const [apiLatency, setApiLatency] = useState(0);
  const [cacheHit, setCacheHit] = useState(false);

  // Journey Intelligence state
  const [journeyResult, setJourneyResult] = useState<any | null>(null);
  const [journeyGeojson, setJourneyGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  // View Mode state (Desktop vs Mobile Preview)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

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
    setJourneyResult(result);
    setJourneyGeojson(result?.journey?.geojson ?? null);
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#09090b]">
      {/* View Mode Banner Toggle */}
      <div className="px-4 py-1.5 bg-zinc-950 border-b border-zinc-850 flex justify-between items-center z-50 text-xs shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-black text-sky-400 font-mono tracking-wider">transitOS</span>
          <span className="text-[10px] text-zinc-500 font-bold">Client UI Suite</span>
        </div>

        <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("desktop")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              viewMode === "desktop"
                ? "bg-sky-500 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🖥️ Desktop Digital Twin (SS #1)
          </button>
          <button
            onClick={() => setViewMode("mobile")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              viewMode === "mobile"
                ? "bg-sky-500 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            📱 Mobile PWA 12-Screens (SS #2)
          </button>
        </div>

        <div className="text-[10px] text-zinc-500 font-mono">
          Twin Status: <span className="text-emerald-400 font-bold">Active</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 w-full h-full overflow-hidden relative">
        {viewMode === "desktop" ? (
          <>
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
              onJourneyResult={handleJourneyResult}
              onModeChange={setAppMode}
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
          </>
        ) : (
          <div className="flex-1 flex justify-center items-center bg-zinc-950 p-4">
            <div className="w-[410px] h-[820px] max-h-full rounded-[40px] border-8 border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden relative flex flex-col">
              <MobileViewSwitcher />
            </div>
          </div>
        )}
      </div>

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
