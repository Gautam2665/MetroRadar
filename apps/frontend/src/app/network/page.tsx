"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { useDigitalTwin } from "../../hooks/useDigitalTwin";
import { useRealtime } from "../../hooks/useRealtime";
import { useStations } from "../../hooks/useStations";
import { Station } from "../../models/station";
import { RealtimeVehicle } from "../../models/vehicle";
import { CITY_METADATA } from "../../config/cityMetadata";
import { useCityContext } from "../../contexts/CityContext";

interface CorridorDef {
  code: string;
  searchKey: string;
  name: string;
  route: string;
  color: string;
  defaultStns: number;
}

const MUMBAI_CORRIDORS: CorridorDef[] = [
  { code: "LINE1", searchKey: "Line 1", name: "Line 1 (Blue)", route: "Versova ↔ Ghatkopar", color: "#00A3E0", defaultStns: 12 },
  { code: "LINE2A", searchKey: "Line 2A", name: "Line 2A (Yellow)", route: "Dahisar (E) ↔ Andheri (W)", color: "#F59E0B", defaultStns: 17 },
  { code: "LINE3", searchKey: "Line 3", name: "Line 3 (Aqua)", route: "Aarey JVLR ↔ BKC", color: "#00C49F", defaultStns: 10 },
  { code: "LINE7", searchKey: "Line 7", name: "Line 7 (Red)", route: "Dahisar (E) ↔ Gundavali", color: "#EF4444", defaultStns: 14 },
  { code: "LINE2B", searchKey: "Line 2B", name: "Line 2B (Yellow Phase 2)", route: "Mandale Depot ↔ Chembur", color: "#F0C800", defaultStns: 5 },
  { code: "MONORAIL", searchKey: "Monorail", name: "Monorail", route: "Chembur ↔ Sant Gadge Maharaj Chowk", color: "#14B8A6", defaultStns: 17 },
];

function countVehiclesForCorridor(
  vehicles: RealtimeVehicle[],
  lineCode: string,
  lineName: string
): number {
  if (!vehicles || vehicles.length === 0) return 0;
  const cNorm = lineCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nNorm = lineName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return vehicles.filter((v) => {
    const vId = (v.lineId || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const vName = (v.lineName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      (vId && (vId.includes(cNorm) || cNorm.includes(vId))) ||
      (vName && (vName.includes(nNorm) || nNorm.includes(vName)))
    );
  }).length;
}

function getStationCountForLine(stns: Station[], lineCode: string, fallbackCount: number): number {
  if (!stns || stns.length === 0) return fallbackCount;
  const count = stns.filter((s) => {
    const lines = s.lines || [];
    const infra = s.lineInfrastructure || [];
    const all = [...lines, ...infra];
    return all.some((l: any) => {
      const code = (l.code || l.id || l.lineCode || "").toUpperCase();
      const name = (l.name || l.lineName || "").toUpperCase();
      return code.includes(lineCode) || name.includes(lineCode);
    });
  }).length;
  return count > 0 ? count : fallbackCount;
}

function NetworkContent() {
  const { activeCity, setActiveCity } = useCityContext();
  const { data: vehicles, loading: realtimeLoading } = useRealtime(activeCity, 10000);
  const { data: stations } = useStations(activeCity);
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

  // Dynamic Headway calculation based on IST and active fleet size
  const headwayInfo = useMemo(() => {
    if (realtimeLoading && vehicles.length === 0) {
      return { text: "Synchronizing Telemetry...", isClosed: false };
    }
    if (vehicles.length === 0) {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 5.5 * 3600000);
      const hour = ist.getHours();
      const mins = ist.getMinutes();
      const currentMins = hour * 60 + mins;
      const isOffPeak = currentMins >= 23 * 60 + 30 || currentMins < 5 * 60 + 30;
      if (isOffPeak) {
        return { text: "Service Resumes ~05:30 AM", isClosed: true };
      }
      return { text: "Regular Scheduled Service (~6-8 min)", isClosed: false };
    }
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 3600000);
    const hour = ist.getHours();
    const isPeak = (hour >= 8 && hour < 12) || (hour >= 17 && hour < 21);

    if (vehicles.length >= 40) {
      return { text: isPeak ? "Peak Headway: ~3-5 min" : "Headway: ~5-7 min", isClosed: false };
    } else if (vehicles.length >= 20) {
      return { text: isPeak ? "Headway: ~4-6 min" : "Headway: ~6-8 min", isClosed: false };
    } else {
      return { text: "Headway: ~8-12 min", isClosed: false };
    }
  }, [realtimeLoading, vehicles.length]);

  // Dynamic corridor list with live train count and station count
  const corridors = useMemo(() => {
    if (activeCity === "mumbai") {
      return MUMBAI_CORRIDORS.map((c) => ({
        ...c,
        stationCount: getStationCountForLine(stations, c.code, c.defaultStns),
        liveTrains: countVehiclesForCorridor(vehicles, c.code, c.searchKey),
      }));
    }

    const lineMap = new Map<string, { code: string; name: string; color: string; count: number }>();
    for (const s of stations) {
      const sLines = s.lines || [];
      for (const l of sLines) {
        const key = (l.name || l.code || "Metro").trim();
        if (!lineMap.has(key)) {
          lineMap.set(key, {
            code: l.code || key,
            name: key,
            color: l.color || "#00e5ff",
            count: 0,
          });
        }
        lineMap.get(key)!.count += 1;
      }
    }

    if (lineMap.size > 0) {
      return Array.from(lineMap.values()).map((l) => ({
        code: l.code,
        searchKey: l.name,
        name: l.name,
        route: `${l.name} Corridor`,
        color: l.color,
        stationCount: l.count,
        liveTrains: countVehiclesForCorridor(vehicles, l.code, l.name),
      }));
    }

    return MUMBAI_CORRIDORS.map((c) => ({
      ...c,
      stationCount: c.defaultStns,
      liveTrains: countVehiclesForCorridor(vehicles, c.code, c.searchKey),
    }));
  }, [activeCity, stations, vehicles]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-16 relative h-full">
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
                                  {eta.etaMins === null || eta.etaMins === undefined ? (
                                    <span className="text-xs text-[#bac9cc] block font-semibold">Service Closed</span>
                                  ) : eta.etaMins <= 0 ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                      Arriving
                                    </span>
                                  ) : (
                                    <p className="text-lg font-bold text-[#00e5ff] leading-none">
                                      {eta.etaMins}<span className="text-xs font-normal ml-0.5">min</span>
                                    </p>
                                  )}
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
                <div className="flex flex-col h-full p-5 space-y-4 overflow-y-auto scrollbar-hide">
                  <div>
                    <h2 className="text-sm font-bold text-[#dfe2ee] uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></span>
                      Network Explorer
                    </h2>
                    <p className="text-xs text-[#bac9cc] mt-1">
                      Real-time telemetry and Digital Twins across Mumbai rapid transit.
                    </p>
                  </div>

                  {/* Live Fleet Telemetry Card */}
                  <div className="glass-card rounded-xl p-4 border border-white/10 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#00e5ff] text-base">sensors</span>
                        <span className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">Fleet Status</span>
                      </div>

                      {/* Dynamic Badge */}
                      {realtimeLoading && vehicles.length === 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00e5ff] border border-cyan-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />
                          Syncing Telemetry...
                        </span>
                      ) : vehicles.length === 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Service Closed (Night)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Operational
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        {realtimeLoading && vehicles.length === 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-8 h-7 bg-white/10 rounded animate-pulse" />
                            <span className="text-xs text-[#bac9cc] font-medium">Connecting...</span>
                          </div>
                        ) : (
                          <>
                            <span className={`text-2xl font-black ${vehicles.length === 0 ? "text-slate-400" : "text-white"}`}>
                              {vehicles.length}
                            </span>
                            <span className="text-xs text-[#bac9cc] ml-1.5 font-medium">Trains on Track</span>
                          </>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium ${headwayInfo.isClosed ? "text-amber-400" : "text-[#00e5ff]"}`}>
                        {headwayInfo.text}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 border-t border-white/5 pt-2 leading-relaxed">
                      {realtimeLoading && vehicles.length === 0
                        ? "Contacting transit telemetry ingest service to stream real-time train positions and delays..."
                        : vehicles.length === 0
                        ? headwayInfo.isClosed
                          ? "Revenue passenger service has concluded for the day. Regular service resumes during morning operating hours (~05:30 IST)."
                          : "Regular passenger schedule active. Awaiting real-time telemetry signals from operational train sets."
                        : "Tap any station circle on the map to inspect live platform ETAs, crowd levels, concourse layout, and exit gates."}
                    </p>
                  </div>

                  {/* Active Lines Overview */}
                  <div className="glass-card rounded-xl p-4 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
                        {vehicles.length > 0 ? "Operational Corridors" : "Rapid Transit Corridors"}
                      </h3>
                      {vehicles.length === 0 && !realtimeLoading && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                          Off-Peak Standby
                        </span>
                      )}
                    </div>

                    {corridors.map((line) => (
                      <div
                        key={line.code}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: line.color,
                              boxShadow: vehicles.length > 0 ? `0 0 8px ${line.color}80` : "none",
                              opacity: vehicles.length === 0 && !realtimeLoading ? 0.6 : 1,
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{line.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{line.route}</p>
                          </div>
                        </div>

                        {/* Status / Count pill */}
                        {realtimeLoading && vehicles.length === 0 ? (
                          <span className="inline-block w-14 h-4 bg-white/5 rounded animate-pulse" />
                        ) : vehicles.length === 0 ? (
                          <span className="text-[10px] font-mono text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0 ml-2">
                            Closed · {line.stationCount} Stns
                          </span>
                        ) : line.liveTrains > 0 ? (
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold shrink-0 ml-2">
                            {line.liveTrains} Live · {line.stationCount} Stns
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                            {line.stationCount} Stns
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Map Legend */}
                  <div className="glass-card rounded-xl p-4 border border-white/10 space-y-2.5">
                    <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">Map Legend</h3>
                    {[
                      { icon: "location_on", color: "#00e5ff", label: "Station Pin (Click to Inspect)" },
                      { icon: "circle", color: "#ffffff", label: "Live Moving Train" },
                      { icon: "linear_scale", color: "#F59E0B", label: "Active Track Geometry" },
                      { icon: "transfer_within_a_station", color: "#a855f7", label: "Interchange Hub" },
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
