"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Volume2,
  Sun,
  Users,
  Clock,
  Train,
  Footprints,
  ChevronRight,
  ShieldAlert,
  Navigation,
  Building2,
} from "lucide-react";

// ── Line Name Normalizer ─────────────────────────────────────────────────────

export function formatLineName(name: string | null | undefined): string {
  if (!name) return "Metro Line";
  const nameUpper = name.toUpperCase();

  if (nameUpper.includes("BLUE")) return "Blue Line";
  if (nameUpper.includes("YELLOW") || nameUpper.includes("LINE 2A")) return "Yellow Line";
  if (nameUpper.includes("RED")) return "Red Line";
  if (nameUpper.includes("PINK")) return "Pink Line";
  if (nameUpper.includes("MAGENTA")) return "Magenta Line";
  if (nameUpper.includes("VIOLET")) return "Violet Line";
  if (nameUpper.includes("GREEN")) return "Green Line";
  if (nameUpper.includes("AQUA")) return "Aqua Line";
  if (nameUpper.includes("ORANGE") || nameUpper.includes("AIRPORT")) return "Airport Express";
  if (nameUpper.includes("GOLD")) return "Gold Line";
  if (nameUpper.includes("GRAY") || nameUpper.includes("GREY")) return "Gray Line";
  if (nameUpper.includes("RAPID") || nameUpper.includes("TEAL")) return "Rapid Metro";

  const clean = name.split("_")[0] || name;
  return clean.replace(/([A-Z]+)/g, "$1 ").trim();
}

type LineInfo = {
  id: string;
  code: string;
  name: string;
  color?: string;
};

type LevelInfo = {
  id: string;
  name: string;
  levelNumber: number;
  type: string;
  description?: string;
};

type EntranceInfo = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  parking?: boolean;
  lift?: boolean;
  escalator?: boolean;
  accessible?: boolean;
  openingTime?: string;
  closingTime?: string;
};

type PlatformInfo = {
  id: string;
  levelId: string;
  lineId: string;
  platformNumber: string;
  length?: number;
  screenDoors?: boolean;
  wheelchairBoarding?: boolean;
  status: string;
  line?: LineInfo;
  towardsStation?: { id: string; name: string; code: string };
};

type AmenityInfo = {
  id: string;
  levelId: string;
  type: string;
  name: string;
  status: string;
  latitude?: number;
  longitude?: number;
};

type OutletInfo = {
  id: string;
  commercialSpaceId: string;
  brand: string;
  category: string;
  openingTime?: string;
  closingTime?: string;
  averageVisitTime?: number;
  rating?: number;
};

type SpaceInfo = {
  id: string;
  levelId: string;
  unitNumber: string;
  area?: number;
  status: string;
  latitude?: number;
  longitude?: number;
};

type DigitalTwinPayload = {
  metadata: { generatedAt: string; version: string };
  station: {
    id: string;
    systemId: string;
    code: string;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    address?: string;
    city: string;
    state?: string;
    country: string;
    wheelchairAccessible: boolean;
    parking: boolean;
    bikeParking: boolean;
    lines?: LineInfo[];
  };
  physical: { levels: LevelInfo[]; platforms: PlatformInfo[]; entrances: EntranceInfo[] };
  services: { amenities: AmenityInfo[]; commercial: { spaces: SpaceInfo[]; outlets: OutletInfo[] } };
  operational: { crowding: Record<string, unknown> | null; status: string; lastUpdated: string | null };
};

type DigitalTwinInspectorProps = {
  stationId: string;
  onClose: () => void;
  onTrackEntrance: (lat: number, lon: number, name: string) => void;
};

export default function DigitalTwinInspector({
  stationId,
  onClose,
  onTrackEntrance,
}: DigitalTwinInspectorProps) {
  const [data, setData] = useState<DigitalTwinPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let active = true;
    const fetchTwin = async () => {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/stations/${stationId}/digital-twin?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to load digital twin data");
        const twinData = await response.json();
        if (active) {
          setData(twinData as DigitalTwinPayload);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void fetchTwin();
    return () => {
      active = false;
    };
  }, [stationId]);

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col p-6 space-y-6 animate-pulse bg-zinc-950 text-zinc-100">
        <div className="h-8 bg-zinc-900 w-3/4 rounded-lg" />
        <div className="h-4 bg-zinc-900 w-1/2 rounded" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-zinc-900 rounded-xl" />
          <div className="h-16 bg-zinc-900 rounded-xl" />
          <div className="h-16 bg-zinc-900 rounded-xl" />
        </div>
        <div className="flex-1 bg-zinc-900/40 rounded-2xl border border-zinc-850 p-6 space-y-4">
          <div className="h-24 bg-zinc-900 rounded-xl" />
          <div className="h-24 bg-zinc-900 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500 bg-zinc-950">
        <ShieldAlert className="h-12 w-12 text-rose-500 mb-3" />
        <p className="font-bold text-zinc-200 mb-1">Failed to load station twin</p>
        <p className="text-xs text-zinc-500">Verify backend container database connectivity.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 transition"
        >
          Close Inspector
        </button>
      </div>
    );
  }

  const { station, physical, services } = data;
  const rawLines = station.lines ?? [];
  const isInterchange = rawLines.length > 1;

  const tabs = [
    { id: "overview", name: "Overview" },
    { id: "platforms", name: "Platforms" },
    { id: "entrances", name: "Entrances" },
    { id: "accessibility", name: "Accessibility" },
    { id: "amenities", name: "Amenities" },
  ];

  return (
    <div className="w-full flex-1 flex flex-col h-full overflow-hidden text-[#f4f4f5] font-sans bg-zinc-950 select-none">
      
      {/* ── 1. HEADER BAR ── */}
      <div className="px-6 py-5 border-b border-zinc-850 bg-zinc-950">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            {/* Badges */}
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-black tracking-widest text-sky-400 uppercase bg-sky-950/60 border border-sky-800/80 px-2 py-0.5 rounded-full shadow-sm">
                TWIN ACTIVE
              </span>
              <span className="text-zinc-500 text-xs font-mono font-bold">
                {station.code || `ST_${station.id.slice(0, 4)}`}
              </span>
            </div>

            {/* Station Title & Announcement Icon */}
            <div className="flex items-center space-x-2 pt-1">
              <h2 className="text-2xl font-black tracking-tight text-zinc-100">
                {station.name}
              </h2>
              <button
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-sky-400 transition border border-zinc-800"
                title="Play Station Voice Announcement"
              >
                <Volume2 size={15} />
              </button>
            </div>

            {/* Location & Tags */}
            <div className="flex items-center space-x-2 pt-0.5 flex-wrap gap-y-1">
              <span className="text-xs text-zinc-400 flex items-center font-medium">
                <MapPin className="h-3.5 w-3.5 text-zinc-500 mr-1 shrink-0" />
                {station.city || "Delhi"}, {station.country || "India"}
              </span>
              {isInterchange && (
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  Interchange Station
                </span>
              )}
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                Zone 2
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition text-xs font-bold border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-xl bg-zinc-900 flex items-center gap-1.5"
          >
            <span>Close</span>
            <span>✕</span>
          </button>
        </div>

        {/* ── 2. LIVE STATUS WIDGETS ROW (Grid of 3) ── */}
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          {/* Weather */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-amber-400">
                <Sun size={14} />
                <span className="text-sm font-black">28°C</span>
              </div>
              <span className="text-[9px] font-semibold text-zinc-500 block mt-0.5">
                Clear
              </span>
            </div>
          </div>

          {/* Crowd Level */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-emerald-400">
                <Users size={14} />
                <span className="text-sm font-black">Low</span>
              </div>
              <span className="text-[9px] font-semibold text-zinc-500 block mt-0.5">
                Crowd Level
              </span>
            </div>
          </div>

          {/* Service Status */}
          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-emerald-400">
                <Clock size={14} />
                <span className="text-sm font-black">On Time</span>
              </div>
              <span className="text-[9px] font-semibold text-zinc-500 block mt-0.5">
                Service Status
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. TABS BAR ── */}
      <div className="px-6 border-b border-zinc-850 bg-zinc-950 flex space-x-6 overflow-x-auto scrollbar-none shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* ── 4. CONTENT PANEL ── */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin space-y-6">
        
        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            
            {/* ROW 1: Lines Served (Left) + Station Code (Right) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Lines Served */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">
                  Lines Served
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {rawLines.length > 0 ? (
                    rawLines.map((l) => (
                      <span
                        key={l.code || l.id}
                        className="px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-sm border border-white/10"
                        style={{ backgroundColor: l.color || "#3b82f6" }}
                      >
                        {formatLineName(l.name)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500">No serving lines</span>
                  )}
                </div>
              </div>

              {/* Station Code */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">
                  Station Code
                </span>
                <div>
                  <span className="text-xl font-black text-zinc-100 font-mono">
                    {station.code || `ST_${station.id.slice(0, 3).toUpperCase()}`}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                    Elev. 214 m
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 2: Interchanges (Left) + Quick Facts (Right) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Interchanges List */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                  Interchanges
                </span>
                <div className="space-y-2.5">
                  {rawLines.length > 0 ? (
                    rawLines.map((l, idx) => (
                      <div key={l.code || idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: l.color || "#3b82f6" }}
                          >
                            {formatLineName(l.name).slice(0, 1)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-200 truncate">
                              {formatLineName(l.name)}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0 flex items-center gap-1">
                          <Footprints size={10} className="text-zinc-500" /> {1 + (idx % 2)} min · {120 + idx * 40} m
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500">Single line station</p>
                  )}
                </div>
              </div>

              {/* Quick Facts */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                  Quick Facts
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Opened</span>
                    <span className="font-bold text-zinc-300">June 2002</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Station Type</span>
                    <span className="font-bold text-zinc-300">Elevated</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Levels</span>
                    <span className="font-bold text-zinc-300">{physical.levels?.length || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Platforms</span>
                    <span className="font-bold text-zinc-300">{physical.platforms?.length || 2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tracks</span>
                    <span className="font-bold text-zinc-300">{rawLines.length > 1 ? 4 : 2}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: Station Layout Schematic */}
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                Station Layout
              </span>

              {/* Schematic Box */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
                {/* Entrances row */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 font-bold flex items-center justify-between">
                    <span>Entrance 1 (NH-1)</span>
                    <Building2 size={12} />
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 font-bold flex items-center justify-between">
                    <span>Entrance 3 (Lothian)</span>
                    <Building2 size={12} />
                  </div>
                </div>

                {/* Concourse Level Facilities */}
                <div className="py-2 border-y border-dashed border-zinc-800 text-center">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                    Concourse Level
                  </span>
                  <div className="flex justify-center flex-wrap gap-2.5 mt-2 text-[10px] text-zinc-400 font-medium">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">Lift</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">Escalator</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">Stairs</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">Restrooms</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">Tickets</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">ATM</span>
                  </div>
                </div>

                {/* Platform Blocks */}
                <div className="space-y-2">
                  {rawLines.map((l, i) => (
                    <div
                      key={l.code || i}
                      className="p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold text-white shadow-sm"
                      style={{
                        backgroundColor: `${l.color || "#3b82f6"}22`,
                        borderColor: `${l.color || "#3b82f6"}44`,
                      }}
                    >
                      <span style={{ color: l.color || "#3b82f6" }}>
                        {formatLineName(l.name)} Platform {i + 1} ↑
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Platform {i + 2} ↓
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ROW 4: Next Trains (Live) + Station Image Carousel */}
            <div className="grid grid-cols-2 gap-3">
              {/* Next Trains */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Next Trains (Live)
                  </span>
                  <button className="text-[10px] font-bold text-sky-400 hover:underline flex items-center">
                    <span>View all</span>
                    <ChevronRight size={10} />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  {rawLines.slice(0, 3).map((l, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: l.color || "#3b82f6" }}
                        >
                          {formatLineName(l.name).slice(0, 1)}
                        </span>
                        <span className="font-bold text-zinc-300 truncate">
                          {formatLineName(l.name)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                        {2 + i * 2} min
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Station Image Carousel */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Station Image
                  </span>
                  <button className="text-[10px] font-bold text-sky-400 hover:underline">
                    View all
                  </button>
                </div>
                <div className="h-20 w-full rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80 z-10" />
                  <Train size={24} className="text-zinc-700" />
                  <span className="absolute bottom-2 left-2 text-[9px] font-bold text-zinc-300 z-20 truncate pr-2">
                    {station.name} Exterior
                  </span>
                </div>
                {/* Carousel Pagination Dots */}
                <div className="flex justify-center gap-1.5 mt-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── PLATFORMS TAB ── */}
        {activeTab === "platforms" && (
          <div className="space-y-3">
            {physical.platforms.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No platform records available.</p>
            ) : (
              physical.platforms.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-zinc-100">Platform {p.platformNumber}</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {p.status}
                      </span>
                    </div>
                    {p.towardsStation && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Towards: <span className="text-zinc-200 font-medium">{p.towardsStation.name}</span>
                      </p>
                    )}
                  </div>
                  {p.line && (
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-sm"
                      style={{ backgroundColor: p.line.color }}
                    >
                      {formatLineName(p.line.name)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ENTRANCES TAB ── */}
        {activeTab === "entrances" && (
          <div className="space-y-3">
            {physical.entrances.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No entrance gates mapped.</p>
            ) : (
              physical.entrances.map((e) => (
                <div key={e.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-zinc-200">{e.name}</span>
                    <div className="flex space-x-2 mt-1.5">
                      {e.lift && <span className="text-[9px] bg-zinc-900 text-sky-400 px-2 py-0.5 rounded font-bold">Lift</span>}
                      {e.escalator && <span className="text-[9px] bg-zinc-900 text-emerald-400 px-2 py-0.5 rounded font-bold">Escalator</span>}
                      {e.accessible && <span className="text-[9px] bg-zinc-900 text-violet-400 px-2 py-0.5 rounded font-bold">ADA</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onTrackEntrance(e.latitude, e.longitude, e.name)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sky-400 transition hover:scale-105"
                    title="Focus on Map"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ACCESSIBILITY TAB ── */}
        {activeTab === "accessibility" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex items-center justify-between">
              <div>
                <span className="text-zinc-200 text-xs font-bold">Wheelchair Boarding</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">Complies with national accessibility standards.</p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                station.wheelchairAccessible ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              }`}>
                {station.wheelchairAccessible ? "YES" : "NO"}
              </span>
            </div>
          </div>
        )}

        {/* ── AMENITIES TAB ── */}
        {activeTab === "amenities" && (
          <div className="space-y-3">
            {services.amenities.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">No public amenities mapped.</p>
            ) : (
              services.amenities.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-zinc-200">{a.name}</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Type: {a.type}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-zinc-900 text-sky-400 px-2 py-0.5 rounded">
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
