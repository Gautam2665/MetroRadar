"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { useDigitalTwin } from "../../hooks/useDigitalTwin";
import { useRealtime } from "../../hooks/useRealtime";
import { CITY_METADATA } from "../../config/cityMetadata";
import { useCityContext } from "../../contexts/CityContext";

function NetworkContent() {
  const { activeCity, setActiveCity } = useCityContext();
  const { data: vehicles } = useRealtime(activeCity, 10000);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedStationName, setSelectedStationName] = useState<string>("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeLevel, setActiveLevel] = useState<"G" | "L1" | "L2">("L1");

  const searchParams = useSearchParams();

  useEffect(() => {
    const stationId = searchParams.get("stationId") || searchParams.get("station");
    const stationName = searchParams.get("stationName");
    if (stationId) {
      setSelectedStationId(stationId);
      setSelectedStationName(stationName || "Station");
      setInspectorOpen(true);
    }
  }, [searchParams]);

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.mumbai || CITY_METADATA.delhi;

  const { data: twin, loading: twinLoading } = useDigitalTwin(
    inspectorOpen ? selectedStationId : null,
    selectedStationName
  );

  const handleStationClick = useCallback(
    (station: { id: string; name: string; code?: string; city?: string }) => {
      setSelectedStationId(station.id);
      setSelectedStationName(station.name);
      setInspectorOpen(true);
    },
    []
  );

  const handleMapStationSelect = useCallback(
    (stationId: string) => {
      setSelectedStationId(stationId);
      setSelectedStationName("Station");
      setInspectorOpen(true);
    },
    []
  );

  const activeName = twin?.stationName || selectedStationName || "Station";
  const activeCode = twin?.code;
  const activeCityName = twin?.city || activeCity;
  const activeLines = twin?.lines || [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header
          activeCity={activeCity}
          onCityChange={(city) => {
            setActiveCity(city);
            setInspectorOpen(false);
            setSelectedStationId(null);
          }}
        />

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
                {selectedStationId && (
                  <span className="text-xs text-[#dfe2ee] bg-[#262a33]/80 px-3 py-1 rounded-full border border-white/10 pointer-events-auto">
                    {activeName}
                  </span>
                )}
              </div>

              <MapContainer
                activeCity={activeCity}
                activeLayers={["lines", "stations", "realtime"]}
                vehicles={vehicles}
                selectedStationId={selectedStationId}
                activeLevel={activeLevel}
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
              {inspectorOpen && selectedStationId ? (
                <div className="flex flex-col h-full">
                  {/* Inspector Header */}
                  <div className="p-5 border-b border-white/10 flex justify-between items-start shrink-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-wider mb-1">Station Inspector</p>
                      {twinLoading ? (
                        <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
                      ) : (
                        <h2 className="text-base font-bold text-[#dfe2ee] truncate">{activeName}</h2>
                      )}
                      {/* Station meta row */}
                      {activeCode && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-[#bac9cc] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {activeCode}
                          </span>
                          {activeCityName && (
                            <span className="text-[10px] text-[#bac9cc]">{activeCityName}</span>
                          )}
                          {twin?.wheelchairAccessible && (
                            <span className="text-[10px] text-[#4ade80] flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">accessible</span>
                              Accessible
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setInspectorOpen(false);
                        setSelectedStationId(null);
                      }}
                      className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#bac9cc] transition-colors shrink-0 ml-3"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  {/* Lines color badges */}
                  {activeLines.length > 0 && (
                    <div className="px-5 py-3 border-b border-white/5 flex flex-wrap gap-1.5 shrink-0">
                      {activeLines.map((line, i) => {
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
                                  <p className="text-lg font-bold text-[#00e5ff] leading-none">
                                    {eta.etaMins}<span className="text-xs font-normal ml-0.5">min</span>
                                  </p>
                                  {eta.crowdLevel ? (
                                    <p className="text-[10px] font-bold" style={{ color: eta.crowdLevel === "Low" ? "#4ade80" : eta.crowdLevel === "Medium" ? "#fec931" : "#ef4444" }}>
                                      {eta.crowdLevel} Crowd
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Exits & Interchanges */}
                        <div className="glass-card rounded-xl p-4 border border-white/10">
                          <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#bac9cc] text-sm">door_open</span>
                            Exits &amp; Interchanges
                          </h3>
                          {twin.exits && twin.exits.length > 0 ? (
                            <div className="space-y-2">
                              {twin.exits.map((exit, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-[#181c24] rounded-lg border border-white/5">
                                  <div>
                                    <p className="text-xs font-bold text-[#dfe2ee]">{exit.gate}</p>
                                    {exit.name && exit.name !== exit.gate ? (
                                      <p className="text-[11px] text-[#bac9cc]">{exit.name}</p>
                                    ) : null}
                                  </div>
                                  {typeof exit.distanceMeter === "number" && exit.distanceMeter > 0 ? (
                                    <span className="text-[11px] font-bold text-[#bac9cc] flex items-center gap-1 font-mono">
                                      <span className="material-symbols-outlined text-xs">directions_walk</span>
                                      {exit.distanceMeter}m
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#bac9cc]/60">No gate details available</p>
                          )}
                        </div>

                        {/* Levels */}
                        <div className="glass-card rounded-xl p-4 border border-white/10">
                          <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#bac9cc] text-sm">layers</span>
                              Station Levels
                            </span>
                            <span className="text-[10px] text-[#00e5ff] font-mono">Floor {activeLevel}</span>
                          </h3>
                          <div className="space-y-2">
                            {twin.levels.map((level, lIdx) => {
                              const lvlTag: "G" | "L1" | "L2" =
                                level.levelNumber !== undefined && level.levelNumber <= 0
                                  ? "G"
                                  : level.levelNumber === 1
                                  ? "L1"
                                  : "L2";
                              const isLevelSelected = activeLevel === lvlTag;

                              return (
                                <button
                                  key={level.id || lIdx}
                                  type="button"
                                  onClick={() => setActiveLevel(lvlTag)}
                                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                                    isLevelSelected
                                      ? "bg-[#00e5ff]/10 border-[#00e5ff]/50 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                                      : "bg-[#181c24] border-white/5 hover:border-white/20"
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <p className={`text-xs font-bold ${isLevelSelected ? "text-[#00e5ff]" : "text-[#dfe2ee]"}`}>
                                      {level.name}
                                    </p>
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                        isLevelSelected
                                          ? "bg-[#00e5ff] text-slate-950"
                                          : "bg-white/5 text-[#bac9cc]"
                                      }`}
                                    >
                                      {lvlTag}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {level.facilities.length > 0 ? (
                                      level.facilities.map((f, fi) => (
                                        <span key={fi} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#bac9cc] border border-white/5">
                                          {f}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {level.lineName ? `${level.lineName} · Verified Layout` : "Passenger Transit Circulation"}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
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

                  <div className="glass-card rounded-xl p-5 border border-white/10 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-semibold text-[#dfe2ee] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#bac9cc] text-lg">subway</span>
                          Next Train
                        </h3>
                        <p className="text-xs text-[#bac9cc] mt-1">
                          {twin?.platformEtas?.[0]?.platform ? `${twin.platformEtas[0].platform} · ` : ""}{twin?.platformEtas?.[0]?.recommendedCoach || "Metro Line"}
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
