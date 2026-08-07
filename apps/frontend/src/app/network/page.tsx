"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { useDigitalTwin } from "../../hooks/useDigitalTwin";
import { CITY_METADATA } from "../../config/cityMetadata";

type HoverPreview = { id: string; name: string; code: string; x: number; y: number } | null;

function NetworkContent() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedStationName, setSelectedStationName] = useState("");
  const [hoverPreview, setHoverPreview] = useState<HoverPreview>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeLevel, setActiveLevel] = useState<"G" | "L1" | "L2">("L1");

  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = setTimeout(() => {
      const stationId = searchParams.get("stationId");
      const stationName = searchParams.get("stationName");
      if (stationId) {
        setSelectedStationId(stationId);
        setSelectedStationName(stationName || "Station");
        setInspectorOpen(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  // Digital Twin — cached automatically by useDigitalTwin hook
  const { data: twin, loading: twinLoading } = useDigitalTwin(
    inspectorOpen ? selectedStationId : null,
    selectedStationName
  );

  const handleStationHover = useCallback(
    (station: { id: string; name: string; code?: string }, pos?: { x: number; y: number }) => {
      setHoverPreview({
        id: station.id,
        name: station.name,
        code: station.code || "STN",
        x: pos?.x ?? 0,
        y: pos?.y ?? 0,
      });
    },
    []
  );

  const handleStationClick = useCallback(
    (station: { id: string; name: string; code?: string; city?: string }) => {
      setSelectedStationId(station.id);
      setSelectedStationName(station.name);
      setInspectorOpen(true);
      setHoverPreview(null);
    },
    []
  );

  const handleMapStationSelect = useCallback(
    (stationId: string) => {
      // MapContainer fires onStationSelect with just the ID
      setSelectedStationId(stationId);
      setInspectorOpen(true);
      setHoverPreview(null);
    },
    []
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => { setActiveCity(city); setInspectorOpen(false); setSelectedStationId(null); }} />

        <main className="flex-1 overflow-hidden relative z-0">
          <div className="grid grid-cols-1 md:grid-cols-12 h-full gap-0">
            {/* Map — 8 cols, full height */}
            <div className="md:col-span-8 relative h-[50vh] md:h-full overflow-hidden">
              {/* Map top bar */}
              <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-[#080C14]/80 to-transparent pointer-events-none">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-[#00e5ff] rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-[#00e5ff] uppercase tracking-wider">Live Network</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 uppercase">
                    {currentMeta.name} GTFS Network
                  </span>
                </div>
                {selectedStationId && (
                  <span className="text-xs text-[#dfe2ee] bg-[#262a33]/80 px-3 py-1 rounded-full border border-white/10 pointer-events-auto">
                    {selectedStationName || "Station Selected"}
                  </span>
                )}
              </div>

              <MapContainer
                activeCity={activeCity}
                activeLayers={["lines", "stations", "realtime"]}
                selectedStationId={selectedStationId}
                onStationSelect={handleMapStationSelect}
                onSelectStation={handleStationClick}
              />

              {/* Hover tooltip */}
              {hoverPreview && (
                <div
                  className="absolute z-30 pointer-events-none"
                  style={{ left: hoverPreview.x + 12, top: hoverPreview.y - 48 }}
                >
                  <div className="bg-[#1c2028]/95 border border-white/20 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
                    <p className="text-xs font-bold text-[#dfe2ee]">{hoverPreview.name}</p>
                    <p className="text-[10px] text-[#bac9cc]">{hoverPreview.code} · Click to inspect</p>
                  </div>
                </div>
              )}

              {/* Level Switcher */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-[#31353e]/80 backdrop-blur-md rounded-lg p-1 border border-white/10 z-20">
                {(["G", "L1", "L2"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setActiveLevel(lvl)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                      activeLevel === lvl
                        ? "bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30"
                        : "text-[#bac9cc] hover:bg-white/10"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Panel — 4 cols */}
            <div className="md:col-span-4 flex flex-col h-full bg-[#0f131c]/90 border-l border-white/10 overflow-hidden">
              {inspectorOpen && selectedStationId ? (
                /* Digital Twin Inspector */
                <div className="flex flex-col h-full">
                  {/* Inspector Header */}
                  <div className="p-5 border-b border-white/10 flex justify-between items-start shrink-0">
                    <div>
                      <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-wider mb-0.5">Station Inspector</p>
                      {twinLoading ? (
                        <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
                      ) : (
                        <h2 className="text-base font-bold text-[#dfe2ee]">{twin?.stationName || selectedStationName}</h2>
                      )}
                    </div>
                    <button
                      onClick={() => { setInspectorOpen(false); setSelectedStationId(null); }}
                      className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#bac9cc] transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-5">
                    {twinLoading ? (
                      /* Skeleton */
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="glass-card rounded-xl p-4 border border-white/10 space-y-2">
                            <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                            <div className="h-10 bg-white/5 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : twin ? (
                      <>
                        {/* Platform ETAs */}
                        <div className="glass-card rounded-xl p-4 border border-white/10">
                          <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#00e5ff] text-sm">schedule</span>
                            Platform ETAs
                          </h3>
                          <div className="space-y-2">
                            {twin.platformEtas.map((eta, i) => (
                              <div key={i} className="flex justify-between items-center p-2 bg-[#181c24] rounded-lg border border-white/5">
                                <div>
                                  <p className="text-xs font-bold text-[#dfe2ee]">{eta.platform}</p>
                                  <p className="text-[11px] text-[#bac9cc]">→ {eta.towards}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-[#00e5ff] leading-none">{eta.etaMins}<span className="text-xs font-normal ml-0.5">min</span></p>
                                  <p className="text-[10px] font-bold" style={{ color: eta.crowdLevel === "Low" ? "#4ade80" : eta.crowdLevel === "Medium" ? "#fec931" : "#ef4444" }}>
                                    {eta.crowdLevel} Crowd
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Exits */}
                        <div className="glass-card rounded-xl p-4 border border-white/10">
                          <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#bac9cc] text-sm">door_open</span>
                            Exits & Interchanges
                          </h3>
                          <div className="space-y-2">
                            {twin.exits.map((exit, i) => (
                              <div key={i} className="flex justify-between items-center p-2 bg-[#181c24] rounded-lg border border-white/5">
                                <div>
                                  <p className="text-xs font-bold text-[#dfe2ee]">{exit.gate}</p>
                                  <p className="text-[11px] text-[#bac9cc]">{exit.name}</p>
                                </div>
                                <span className="text-[11px] font-bold text-[#bac9cc] flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">directions_walk</span>
                                  {exit.distanceMeter}m
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Levels */}
                        <div className="glass-card rounded-xl p-4 border border-white/10">
                          <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#bac9cc] text-sm">layers</span>
                            Station Levels
                          </h3>
                          <div className="space-y-2">
                            {twin.levels.map((level) => (
                              <div key={level.id} className="p-2 bg-[#181c24] rounded-lg border border-white/5">
                                <p className="text-xs font-bold text-[#dfe2ee] mb-1">{level.name}</p>
                                <div className="flex flex-wrap gap-1">
                                  {level.facilities.map((f, fi) => (
                                    <span key={fi} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#bac9cc] border border-white/5">{f}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <span className="material-symbols-outlined text-4xl text-[#bac9cc]/30 block mb-2">sensors_off</span>
                        <p className="text-sm text-[#bac9cc]">No digital twin data</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Default state — no station selected */
                <div className="flex flex-col h-full p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider">Network Explorer</h2>
                    <p className="text-xs text-[#bac9cc] mt-1">
                      Click any station on the map to open its Digital Twin inspector.
                    </p>
                  </div>

                  {/* Platform Guide Placeholder */}
                  <div className="glass-card rounded-xl p-5 border border-white/10 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-semibold text-[#dfe2ee] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#bac9cc] text-lg">subway</span>
                          Next Train
                        </h3>
                        <p className="text-xs text-[#bac9cc] mt-1">
                          {twin?.platformEtas?.[0]?.platform || "Platform 1"} · {twin?.platformEtas?.[0]?.recommendedCoach || "Metro Line"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[#bac9cc]">ETA</p>
                      <p className="text-3xl font-bold text-[#00e5ff] leading-none mt-0.5">
                        {twin?.platformEtas?.[0]?.etaMins ?? 5}{" "}
                        <span className="text-lg font-normal">min</span>
                      </p>
                      <p className="text-xs text-[#bac9cc] mt-1">
                        Towards {twin?.platformEtas?.[0]?.towards || currentMeta.quickPills[1] || "Central Station"}
                      </p>
                    </div>
                  </div>

                  {/* Quick tips */}
                  <div className="glass-card rounded-xl p-4 border border-white/10 space-y-3">
                    <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">Map Legend</h3>
                    {[
                      { icon: "location_on", color: "#00e5ff", label: "Station" },
                      { icon: "circle", color: "#ffffff", label: "Live Train" },
                      { icon: "lens", color: "#22c55e", label: "Journey Origin" },
                      { icon: "lens", color: "#ef4444", label: "Destination" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm" style={{ color: item.color }}>{item.icon}</span>
                        <span className="text-xs text-[#bac9cc]">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LiveNetworkPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#080C14] flex items-center justify-center text-[#00e5ff]">Loading Network...</div>}>
      <NetworkContent />
    </Suspense>
  );
}
