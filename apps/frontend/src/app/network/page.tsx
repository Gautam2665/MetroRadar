"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { useDigitalTwin } from "../../hooks/useDigitalTwin";
import { CITY_METADATA } from "../../config/cityMetadata";

type SelectedStation = {
  id: string;
  name: string;
  code?: string;
  city?: string;
  lines?: Array<{ code: string; name: string; color: string }>;
  wheelchairAccessible?: boolean;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

async function fetchStationMeta(stationId: string): Promise<Partial<SelectedStation>> {
  try {
    const res = await fetch(`${BACKEND_URL}/map/stations/${stationId}`);
    if (!res.ok) return {};
    const feat = await res.json() as { properties?: Record<string, unknown> };
    const p = feat.properties || {};
    const rawLines = Array.isArray(p.lines) ? p.lines as Array<{ code: string; name: string; color: string }> : [];
    return {
      name: (p.name as string) || "",
      code: (p.code as string) || "",
      city: (p.city as string) || "",
      wheelchairAccessible: Boolean(p.wheelchairAccessible),
      lines: rawLines,
    };
  } catch {
    return {};
  }
}

function NetworkContent() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedStation, setSelectedStation] = useState<SelectedStation | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeLevel, setActiveLevel] = useState<"G" | "L1" | "L2">("L1");

  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const stationId = searchParams.get("stationId");
      const stationName = searchParams.get("stationName");
      if (stationId) {
        setSelectedStation({ id: stationId, name: stationName || "Station" });
        setInspectorOpen(true);
        // Enrich with full backend data
        const meta = await fetchStationMeta(stationId);
        setSelectedStation((prev) => prev ? { ...prev, ...meta, name: meta.name || prev.name } : null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const { data: twin, loading: twinLoading } = useDigitalTwin(
    inspectorOpen ? selectedStation?.id ?? null : null,
    selectedStation?.name ?? ""
  );

  const handleStationClick = useCallback(
    async (station: { id: string; name: string; code?: string; city?: string }) => {
      setSelectedStation({ id: station.id, name: station.name, code: station.code, city: station.city });
      setInspectorOpen(true);
      // Enrich with lines / wheelchair data
      const meta = await fetchStationMeta(station.id);
      setSelectedStation((prev) => prev ? { ...prev, ...meta, name: meta.name || station.name } : null);
    },
    []
  );

  const handleMapStationSelect = useCallback(
    async (stationId: string) => {
      // Only ID provided — fetch full station info from backend
      setSelectedStation({ id: stationId, name: "Loading..." });
      setInspectorOpen(true);
      const meta = await fetchStationMeta(stationId);
      setSelectedStation({ id: stationId, name: meta.name || "Station", ...meta });
    },
    []
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => { setActiveCity(city); setInspectorOpen(false); setSelectedStation(null); }} />

        <main className="flex-1 overflow-hidden relative z-0">
          <div className="grid grid-cols-1 md:grid-cols-12 h-full gap-0">
            {/* Map — 8 cols */}
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
                {selectedStation && (
                  <span className="text-xs text-[#dfe2ee] bg-[#262a33]/80 px-3 py-1 rounded-full border border-white/10 pointer-events-auto">
                    {selectedStation.name}
                  </span>
                )}
              </div>

              <MapContainer
                activeCity={activeCity}
                activeLayers={["lines", "stations", "realtime"]}
                selectedStationId={selectedStation?.id ?? null}
                onStationSelect={handleMapStationSelect}
                onSelectStation={handleStationClick}
              />

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
              {inspectorOpen && selectedStation ? (
                <div className="flex flex-col h-full">
                  {/* Inspector Header */}
                  <div className="p-5 border-b border-white/10 flex justify-between items-start shrink-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-wider mb-1">Station Inspector</p>
                      {twinLoading || selectedStation.name === "Loading..." ? (
                        <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
                      ) : (
                        <h2 className="text-base font-bold text-[#dfe2ee] truncate">{twin?.stationName || selectedStation.name}</h2>
                      )}
                      {/* Station meta row */}
                      {selectedStation.code && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-[#bac9cc] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {selectedStation.code}
                          </span>
                          {selectedStation.city && (
                            <span className="text-[10px] text-[#bac9cc]">{selectedStation.city}</span>
                          )}
                          {selectedStation.wheelchairAccessible && (
                            <span className="text-[10px] text-[#4ade80] flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">accessible</span>
                              Accessible
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => { setInspectorOpen(false); setSelectedStation(null); }}
                      className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#bac9cc] transition-colors shrink-0 ml-3"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  {/* Lines color badges */}
                  {selectedStation.lines && selectedStation.lines.length > 0 && (
                    <div className="px-5 py-3 border-b border-white/5 flex flex-wrap gap-1.5 shrink-0">
                      {selectedStation.lines.map((line, i) => {
                        // Clean up line name — remove prefix like "RED_", "BLUE_" etc.
                        const displayName = line.name.replace(/^[A-Z]+_/, "").replace(/ to .+$/, "").trim() || line.name;
                        const shortName = displayName.length > 22 ? displayName.substring(0, 22) + "…" : displayName;
                        return (
                          <span
                            key={i}
                            className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
                            style={{
                              backgroundColor: `${line.color}22`,
                              color: line.color,
                              border: `1px solid ${line.color}50`,
                            }}
                          >
                            {shortName}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-5">
                    {twinLoading ? (
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
                            Exits &amp; Interchanges
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
                        <p className="text-xs text-[#bac9cc]/60 mt-1">Station data available above</p>
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




