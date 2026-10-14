"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "../../components/Sidebar";
import { useCityContext } from "../../contexts/CityContext";
import { useStations } from "../../hooks/useStations";
import { useDigitalTwin } from "../../hooks/useDigitalTwin";
import { useAssistantUi } from "../../contexts/AssistantUiContext";

interface StationDetail {
  id: string;
  name: string;
  code: string;
  area: string;
  address: string;
  isInterchange: boolean;
  lines: Array<{ name: string; color: string; badge: string; route: string; hexColor?: string }>;
  type: string;
  platforms: string;
  description: string;
  departures: Array<{ line: string; towards: string; mins: string }>;
  amenities: Array<{ name: string; status: string }>;
  nearbyPlaces: Array<{ name: string; distance: string }>;
  hasParking: boolean;
  wheelchairAccessible: boolean;
}

const LINE_COLOR_MAP: Record<string, { name: string; color: string; badge: string; hex: string; defaultRoute: string }> = {
  LINE1: {
    name: "Line 1",
    color: "bg-blue-600 text-white",
    badge: "Line 1",
    hex: "#007DC5",
    defaultRoute: "Versova ↔ Ghatkopar",
  },
  LINE2A: {
    name: "Line 2A",
    color: "bg-amber-500 text-black",
    badge: "2A",
    hex: "#FACC15",
    defaultRoute: "Dahisar East ↔ Andheri West",
  },
  LINE3: {
    name: "Line 3",
    color: "bg-[#059DB2] text-white",
    badge: "Line 3",
    hex: "#059DB2",
    defaultRoute: "Aarey JVLR ↔ Cuffe Parade",
  },
  LINE7: {
    name: "Line 7",
    color: "bg-red-600 text-white",
    badge: "Line 7",
    hex: "#E31E24",
    defaultRoute: "Kashigaon ↔ Gundavali",
  },
  LINE2B: {
    name: "Line 2B",
    color: "bg-yellow-500 text-black",
    badge: "2B",
    hex: "#F0C800",
    defaultRoute: "Mandale Depot ↔ Diamond Garden",
  },
  MONORAIL: {
    name: "Monorail",
    color: "bg-purple-600 text-white",
    badge: "Mono",
    hex: "#7C3AED",
    defaultRoute: "Sant Gadge Maharaj Chowk ↔ Chembur",
  },
};

const LINE_FILTER_CHIPS = [
  { label: "Line 1", key: "Line 1" },
  { label: "Line 2A", key: "Line 2A" },
  { label: "Line 3", key: "Line 3" },
  { label: "Line 7", key: "Line 7" },
  { label: "Line 2B", key: "Line 2B" },
  { label: "Monorail", key: "Monorail" },
];

export default function StationExplorerPage() {
  const { activeCity } = useCityContext();
  const { toggleAssistant } = useAssistantUi();
  const { data: apiStations } = useStations(activeCity);

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [filterMode, setFilterMode] = useState<"all" | "interchange" | "accessible" | "parking">("all");
  const [selectedLineFilter, setSelectedLineFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isStarred, setIsStarred] = useState(false);

  // Purely dynamic generation from backend GTFS / database stations
  const mumbaiStations: StationDetail[] = useMemo(() => {
    if (!apiStations || apiStations.length === 0) return [];

    // Filter strictly to Mumbai stations
    const rawMumbai = apiStations.filter((st) => {
      const cityLower = (st.city || "").toLowerCase();
      return (
        cityLower === "mumbai" ||
        (st.code && (st.code.startsWith("STN_") || st.code.startsWith("PF_")))
      );
    });

    // Deduplicate by code (or name) so each physical station is listed once
    const seenMap = new Map<string, typeof rawMumbai[0]>();
    rawMumbai.forEach((st) => {
      const key = st.code || st.name.trim().toLowerCase();
      if (!seenMap.has(key)) {
        seenMap.set(key, st);
      }
    });

    const uniqueList = Array.from(seenMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return uniqueList.map((st) => {
      // Map station lines to known Mumbai color badges
      const mappedLines = (st.lines || []).map((l: any) => {
        const codeUpper = (l.code || l.name || "").toUpperCase().replace(/\s+/g, "");
        for (const [key, val] of Object.entries(LINE_COLOR_MAP)) {
          if (codeUpper.includes(key) || key.includes(codeUpper)) {
            return {
              name: val.name,
              color: val.color,
              badge: val.badge,
              route: l.name || val.defaultRoute,
              hexColor: val.hex,
            };
          }
        }
        return {
          name: l.name || "Metro Line",
          color: "bg-cyan-700 text-white",
          badge: l.code || "Metro",
          route: l.name || "Corridor",
          hexColor: l.color || "#00E5FF",
        };
      });

      // Fallback if no lines assigned
      if (mappedLines.length === 0) {
        if (st.code?.includes("L3")) {
          mappedLines.push({
            name: "Line 3",
            color: LINE_COLOR_MAP.LINE3.color,
            badge: LINE_COLOR_MAP.LINE3.badge,
            route: LINE_COLOR_MAP.LINE3.defaultRoute,
            hexColor: LINE_COLOR_MAP.LINE3.hex,
          });
        } else if (st.code?.includes("L2A")) {
          mappedLines.push({
            name: "Line 2A",
            color: LINE_COLOR_MAP.LINE2A.color,
            badge: LINE_COLOR_MAP.LINE2A.badge,
            route: LINE_COLOR_MAP.LINE2A.defaultRoute,
            hexColor: LINE_COLOR_MAP.LINE2A.hex,
          });
        } else if (st.code?.includes("L7")) {
          mappedLines.push({
            name: "Line 7",
            color: LINE_COLOR_MAP.LINE7.color,
            badge: LINE_COLOR_MAP.LINE7.badge,
            route: LINE_COLOR_MAP.LINE7.defaultRoute,
            hexColor: LINE_COLOR_MAP.LINE7.hex,
          });
        } else if (st.code?.includes("MONO")) {
          mappedLines.push({
            name: "Monorail",
            color: LINE_COLOR_MAP.MONORAIL.color,
            badge: LINE_COLOR_MAP.MONORAIL.badge,
            route: LINE_COLOR_MAP.MONORAIL.defaultRoute,
            hexColor: LINE_COLOR_MAP.MONORAIL.hex,
          });
        } else {
          mappedLines.push({
            name: "Line 1",
            color: LINE_COLOR_MAP.LINE1.color,
            badge: LINE_COLOR_MAP.LINE1.badge,
            route: LINE_COLOR_MAP.LINE1.defaultRoute,
            hexColor: LINE_COLOR_MAP.LINE1.hex,
          });
        }
      }

      const isInterchange =
        mappedLines.length > 1 ||
        Boolean((st as any).isInterchange) ||
        st.name.includes("Railway Station") ||
        st.name === "Dahisar (East)" ||
        st.name === "Western Express Highway" ||
        st.name === "Marol Naka" ||
        st.name === "D. N. Nagar" ||
        st.name === "Andheri (West)" ||
        st.name === "Chembur";

      const isUnderground =
        st.code?.includes("L3") ||
        mappedLines.some((l) => l.name === "Line 3") ||
        st.name.includes("Airport") ||
        st.name.includes("CSMIA");

      const defaultDepartures = mappedLines.flatMap((l) => {
        const parts = l.route.split("↔").map((p: string) => p.trim());
        if (parts.length === 2) {
          return [
            { line: l.name, towards: `Towards ${parts[1]}`, mins: "2 min" },
            { line: l.name, towards: `Towards ${parts[0]}`, mins: "6 min" },
          ];
        }
        return [
          { line: l.name, towards: "Next Scheduled Train", mins: "3 min" },
          { line: l.name, towards: "Following Train", mins: "8 min" },
        ];
      });

      const defaultAmenities = [
        { name: "Escalators & Lifts", status: "Available" },
        { name: "Customer Care & Token Booth", status: "Available" },
        { name: "Drinking Water (RO)", status: "Available" },
        { name: "Public Restrooms", status: "Available" },
        { name: "Security Screening & SOS", status: "Active" },
        { name: "Wheelchair Accessibility", status: "Available" },
      ];

      const defaultNearbyPlaces = [
        { name: "Station Concourse & Auto Stand", distance: "50 m" },
        { name: "Main Arterial Road Access", distance: "120 m" },
        { name: "Local Transit Bus Stop", distance: "200 m" },
      ];

      return {
        id: st.id,
        name: st.name,
        code: st.code || `STN_${st.name.substring(0, 3).toUpperCase()}`,
        area: `${st.name}, Mumbai`,
        address: `${st.name}, Mumbai, Maharashtra`,
        isInterchange,
        lines: mappedLines,
        type: isUnderground ? "Underground" : "Elevated",
        platforms: `${(st as any).platformsCount || 2} Platforms`,
        description: `${st.name} is a key rapid transit station on Mumbai's metro network providing seamless commuter connectivity across the Mumbai Metropolitan Region.`,
        departures: defaultDepartures.slice(0, 4),
        amenities: defaultAmenities,
        nearbyPlaces: defaultNearbyPlaces,
        hasParking: !isUnderground,
        wheelchairAccessible: true,
      };
    });
  }, [apiStations]);

  // Ensure an active station is always selected once list loads
  const activeStation = useMemo(() => {
    if (mumbaiStations.length === 0) return null;
    if (selectedStationId) {
      const match = mumbaiStations.find((s) => s.id === selectedStationId);
      if (match) return match;
    }
    // Default to Andheri (West) or first station
    const andheri = mumbaiStations.find((s) => s.name.includes("Andheri (West)"));
    return andheri || mumbaiStations[0];
  }, [mumbaiStations, selectedStationId]);

  // Hook up digital twin for live operational ETAs, real amenities, and real exits
  const { data: twinData } = useDigitalTwin(activeStation?.id || null, activeStation?.name || "Station");

  // Filtered station list based on search, filterMode, and line chips
  const filteredStations = useMemo(() => {
    return mumbaiStations.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (filterMode === "interchange" && !s.isInterchange) return false;
      if (filterMode === "accessible" && !s.wheelchairAccessible) return false;
      if (filterMode === "parking" && !s.hasParking) return false;

      if (selectedLineFilter) {
        const hasLine = s.lines.some((l) =>
          l.name.toLowerCase().replace(/\s+/g, "").includes(selectedLineFilter.toLowerCase().replace(/\s+/g, ""))
        );
        if (!hasLine) return false;
      }

      return true;
    });
  }, [mumbaiStations, searchQuery, filterMode, selectedLineFilter]);

  // Resolve live departures: prioritize digital twin live platform ETAs
  const dynamicDepartures = useMemo(() => {
    if (twinData?.platformEtas && twinData.platformEtas.length > 0) {
      return twinData.platformEtas.map((pe) => ({
        line: pe.platform,
        towards: `Towards ${pe.towards}`,
        mins: pe.etaMins === 0 ? "Arriving" : `${pe.etaMins} min`,
      }));
    }
    return activeStation?.departures || [];
  }, [twinData, activeStation]);

  // Resolve real amenities: read from twinData services/amenities or levels facilities
  const dynamicAmenities = useMemo(() => {
    const rawServicesAmenities = (twinData?.rawDto?.services as any)?.amenities;
    if (Array.isArray(rawServicesAmenities) && rawServicesAmenities.length > 0) {
      return rawServicesAmenities.slice(0, 9).map((am: any) => ({
        name: am.name || "Station Facility",
        status: am.status === "OPERATIONAL" ? "Available" : am.status || "Operational",
      }));
    }

    if (twinData?.levels && twinData.levels.length > 0) {
      const allFacs = Array.from(new Set(twinData.levels.flatMap((lvl) => lvl.facilities || [])));
      if (allFacs.length > 0) {
        return allFacs.slice(0, 9).map((f) => ({
          name: f,
          status: "Available",
        }));
      }
    }

    return activeStation?.amenities || [];
  }, [twinData, activeStation]);

  // Resolve real exits & nearby places: read from twinData exits
  const dynamicExits = useMemo(() => {
    if (twinData?.exits && twinData.exits.length > 0) {
      return twinData.exits.map((ex) => ({
        name: `${ex.gate}: ${ex.name}`,
        distance: ex.distanceMeter ? `${ex.distanceMeter} m` : "Immediate Exit",
      }));
    }
    return activeStation?.nearbyPlaces || [];
  }, [twinData, activeStation]);

  return (
    <div className="bg-[#070B12] text-slate-200 h-screen flex overflow-hidden font-sans select-none text-[13px]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-[260px] h-full overflow-hidden">
        {/* Top Header */}
        <header
          className="h-16 border-b border-[#1F2E43] bg-[#090F19] px-6 flex items-center justify-between shrink-0 gap-6 z-20"
          data-purpose="top-header"
        >
          {/* Search Input */}
          <div className="relative w-96 max-w-md">
            <span className="material-symbols-outlined w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              className="w-full bg-[#101A27] border border-[#1F2E43] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00D5E8]/70 focus:ring-1 focus:ring-[#00D5E8] transition"
              placeholder="Search station name, code or line..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Top Right Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#101A27] border border-[#1F2E43] px-3 py-1.5 rounded-lg text-xs">
              <span className="material-symbols-outlined text-amber-400 text-sm">wb_sunny</span>
              <div>
                <span className="font-bold text-white text-xs">33°C</span>
                <span className="text-[10px] text-slate-400 ml-1">Mumbai, MH</span>
              </div>
            </div>

            <button
              onClick={toggleAssistant}
              className="flex items-center gap-1.5 bg-[#101A27] hover:bg-[#152335] border border-cyan-500/30 text-[#00D5E8] px-3 py-1.5 rounded-lg text-xs font-semibold shadow-[0_0_10px_rgba(0,229,255,0.15)] transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              <span>Transit AI</span>
            </button>

            {/* City Selector (Locked to Mumbai, MH) */}
            <div className="flex items-center gap-1.5 bg-[#101A27] border border-[#1F2E43] px-3 py-1.5 rounded-lg text-xs text-slate-200">
              <span className="material-symbols-outlined text-[#00D5E8] text-sm">location_on</span>
              <span className="font-medium text-white">Mumbai, MH</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#101A27] border border-[#1F2E43] px-2.5 py-1.5 rounded-lg text-xs text-slate-200">
              <span>EN</span>
            </div>


          </div>
        </header>

        {/* Workspace Columns (Left: Directory List | Right: Detailed Inspector) */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN: Station Directory */}
          <section
            className="w-[380px] lg:w-[430px] border-r border-[#1F2E43] flex flex-col bg-[#070B12] shrink-0"
            data-purpose="station-directory-column"
          >
            {/* Header & Filters */}
            <div className="p-5 border-b border-[#1F2E43]/60 space-y-3 shrink-0">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-[#00D5E8] uppercase">
                  MUMBAI STATION DIRECTORY
                </span>
                <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">Find your station</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Search stations across all operational Mumbai metro corridors.
                </p>
              </div>

              {/* Search & Location Button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                    search
                  </span>
                  <input
                    className="w-full bg-[#101A27] border border-[#1F2E43] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D5E8]/80 transition"
                    placeholder="Search station name or code..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => {
                    const first = filteredStations[0];
                    if (first) setSelectedStationId(first.id);
                  }}
                  className="flex items-center gap-1.5 bg-[#101A27] hover:bg-[#172537] border border-cyan-500/40 text-[#00D5E8] px-2.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">my_location</span>
                  <span>Select top</span>
                </button>
              </div>

              {/* Main Filter Pills */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                    filterMode === "all"
                      ? "bg-[#00D5E8] text-slate-950 font-bold"
                      : "bg-[#101A27] border border-[#1F2E43] text-slate-300 hover:border-slate-500"
                  }`}
                >
                  All Stations
                </button>
                <button
                  onClick={() => setFilterMode("interchange")}
                  className={`px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                    filterMode === "interchange"
                      ? "bg-[#00D5E8] text-slate-950 font-bold"
                      : "bg-[#101A27] border border-[#1F2E43] text-slate-300 hover:border-slate-500"
                  }`}
                >
                  Interchanges
                </button>
                <button
                  onClick={() => setFilterMode("accessible")}
                  className={`px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                    filterMode === "accessible"
                      ? "bg-[#00D5E8] text-slate-950 font-bold"
                      : "bg-[#101A27] border border-[#1F2E43] text-slate-300 hover:border-slate-500"
                  }`}
                >
                  Accessible
                </button>
                <button
                  onClick={() => setFilterMode("parking")}
                  className={`px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                    filterMode === "parking"
                      ? "bg-[#00D5E8] text-slate-950 font-bold"
                      : "bg-[#101A27] border border-[#1F2E43] text-slate-300 hover:border-slate-500"
                  }`}
                >
                  Parking
                </button>
              </div>

              {/* Line Filter Pills for Mumbai */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {LINE_FILTER_CHIPS.map((chip) => {
                  const isSelected = selectedLineFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      onClick={() => setSelectedLineFilter(isSelected ? null : chip.key)}
                      className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                          : "bg-[#101A27] border border-[#1F2E43] text-slate-400 hover:text-white"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Counter Header */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-[#00D5E8]">
                  {filteredStations.length} Mumbai stations
                </span>
                <span className="text-xs text-slate-400">Sort: Name (A-Z)</span>
              </div>
            </div>

            {/* Scrollable Stations List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
              {filteredStations.map((station) => {
                const isSelected = activeStation?.id === station.id;
                return (
                  <div
                    key={station.id}
                    onClick={() => setSelectedStationId(station.id)}
                    className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? "bg-[#111D2D] border-2 border-[#00D5E8]/80 shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                        : "bg-[#101A27] border border-[#1F2E43] hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-cyan-950/80 border border-[#00D5E8]/50 text-[#00D5E8]"
                            : "bg-slate-800/80 text-slate-400"
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">subway</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs font-bold text-white truncate">{station.name}</h3>
                          {station.lines.map((l) => (
                            <span
                              key={l.name}
                              className={`px-1.5 py-0.2 rounded text-[10px] font-medium shrink-0 ${l.color}`}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{station.code} • {station.type}</p>
                      </div>
                    </div>
                    {station.isInterchange ? (
                      <span className="material-symbols-outlined text-[#00D5E8] text-sm shrink-0 ml-2" title="Interchange Station">
                        shuffle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-500 text-sm shrink-0 ml-2">
                        chevron_right
                      </span>
                    )}
                  </div>
                );
              })}
              {filteredStations.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No Mumbai stations match the selected filters.
                </div>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: Station Inspector */}
          {activeStation ? (
            <main
              className="flex-1 flex flex-col bg-[#070B12] overflow-y-auto scrollbar-hide"
              data-purpose="station-inspector-details"
            >
              {/* Inspector Top Header: Station Title & Badges */}
              <div className="p-6 pb-4 border-b border-[#1F2E43]/60 shrink-0">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Station Icon Badge */}
                    <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-[#00D5E8]/60 flex items-center justify-center text-[#00D5E8] shadow-[0_0_15px_rgba(0,229,255,0.25)] shrink-0">
                      <span className="material-symbols-outlined text-2xl">subway</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-white">{activeStation.name}</h2>
                        <button
                          onClick={() => setIsStarred(!isStarred)}
                          className={`transition cursor-pointer ${
                            isStarred ? "text-amber-400" : "text-slate-400 hover:text-amber-400"
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {isStarred ? "grade" : "star"}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 flex-wrap">
                        <span className="bg-[#101A27] px-2 py-0.5 rounded border border-[#1F2E43] text-[11px] font-mono text-slate-400">
                          {twinData?.code || activeStation.code}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <span className="material-symbols-outlined text-[#00D5E8] text-xs">location_on</span>
                          <span>{activeStation.area}</span>
                        </div>
                        {activeStation.isInterchange && (
                          <span className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[11px] px-2 py-0.5 rounded-full font-medium">
                            <span className="material-symbols-outlined text-xs">shuffle</span>
                            Interchange Station
                          </span>
                        )}
                        <span className="bg-[#101A27] px-2 py-0.5 rounded border border-[#1F2E43] text-[11px] text-slate-300">
                          {activeStation.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connected Lines Mini Cards */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeStation.lines.map((line) => (
                      <div
                        key={line.name}
                        className="bg-[#101A27] border border-[#1F2E43] rounded-xl px-3 py-2 flex items-center gap-2 min-w-[130px]"
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${line.color}`}>
                          {line.badge}
                        </div>
                        <div className="leading-tight">
                          <span className="text-xs font-bold text-white block">{line.name}</span>
                          <span className="text-[10px] text-slate-400">{line.route}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Station Description */}
                <p className="text-xs text-slate-300 mt-3 max-w-4xl">{activeStation.description}</p>
              </div>

              {/* Navigation Tabs */}
              <div className="px-6 border-b border-[#1F2E43] flex items-center gap-6 shrink-0 bg-[#080D16]">
                {["Overview", "Live Departures", "Exits & Access", "Station Map", "Amenities", "Nearby Places"].map(
                  (tab) => {
                    const tabKey = tab.toLowerCase().replace(/[^a-z]/g, "");
                    const isActive = activeTab === tabKey;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tabKey)}
                        className={`py-2.5 text-xs transition cursor-pointer ${
                          isActive
                            ? "font-bold text-[#00D5E8] border-b-2 border-[#00D5E8]"
                            : "font-medium text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Tab Body Content */}
              <div className="p-6 space-y-5 flex-1">
                {/* Top Grid: Interactive Map & Station Visual / Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Dynamic Inset SVG Line Alignment Representation (7 Cols) */}
                  <div className="lg:col-span-7 bg-[#101A27] border border-[#1F2E43] rounded-xl h-64 relative overflow-hidden flex flex-col justify-between p-3">
                    <svg className="absolute inset-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
                      <rect fill="#080e18" height="100%" width="100%"></rect>
                      <path
                        d="M-50,80 L500,80 M-50,180 L500,180 M120,-20 L120,300 M320,-20 L320,300"
                        stroke="#132338"
                        strokeDasharray="2 3"
                        strokeWidth="1.5"
                      ></path>
                      {activeStation.lines.map((l, idx) => {
                        const yOffset = 140 + idx * 30;
                        return (
                          <line
                            key={l.name}
                            stroke={l.hexColor || "#00E5FF"}
                            strokeLinecap="round"
                            strokeWidth="4"
                            x1="60"
                            x2="440"
                            y1={yOffset}
                            y2={180}
                          />
                        );
                      })}
                      <circle cx="260" cy="180" fill="#00E5FF" r="10" stroke="#FFFFFF" strokeWidth="3"></circle>
                      <circle cx="260" cy="180" fill="none" opacity="0.4" r="18" stroke="#00E5FF" strokeWidth="2"></circle>
                    </svg>

                    <div className="relative z-10 flex justify-between items-start">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeStation.lines.map((l) => (
                          <span
                            key={l.name}
                            className={`text-[10px] font-black px-2 py-0.5 rounded shadow ${l.color}`}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                      <span className="bg-[#101A27]/90 border border-[#1F2E43] text-slate-300 text-[10px] px-2 py-0.5 rounded">
                        {activeStation.type}
                      </span>
                    </div>

                    <div className="relative z-10 flex items-center justify-center">
                      <div className="bg-[#0B1320]/90 border border-[#00D5E8]/80 px-2.5 py-1 rounded-lg text-center backdrop-blur shadow-lg">
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#00D5E8] animate-pulse"></span>
                          {activeStation.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {activeStation.isInterchange ? "Interchange Hub" : "Operational Station"}
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-end justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>Levels: {twinData?.levels?.length || 2}</span>
                        <span>•</span>
                        <span>Platforms: {twinData?.platformEtas?.length || 2}</span>
                      </div>
                      <Link
                        href={`/network?station=${activeStation.id}`}
                        className="bg-[#09101A]/90 border border-[#1F2E43] text-[10px] px-2 py-1 rounded text-[#00D5E8] hover:text-white transition"
                      >
                        Expand in Live Network →
                      </Link>
                    </div>
                  </div>

                  {/* Station Facility Quick Stats (5 Cols) */}
                  <div className="lg:col-span-5 flex flex-col justify-between gap-3">
                    {/* Photo Card */}
                    <div className="relative h-32 rounded-xl overflow-hidden border border-[#1F2E43] group bg-[#101A27]">
                      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/40 via-blue-900/30 to-purple-900/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-cyan-400/60">
                          location_city
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-2.5 left-3">
                        <span className="text-xs font-bold text-white block">{activeStation.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {activeStation.type} Station • Mumbai Rapid Transit
                        </span>
                      </div>
                    </div>

                    {/* Facility Quick Stats Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-[#101A27] border border-[#1F2E43] p-2 rounded-xl text-center">
                        <span className="material-symbols-outlined text-[#00D5E8] text-base mb-1 block mx-auto">
                          apartment
                        </span>
                        <span className="text-[11px] font-bold text-white block">{activeStation.type}</span>
                        <span className="text-[10px] text-slate-400">Station Type</span>
                      </div>

                      <div className="bg-[#101A27] border border-[#1F2E43] p-2 rounded-xl text-center">
                        <span className="material-symbols-outlined text-[#00D5E8] text-base mb-1 block mx-auto">
                          view_column
                        </span>
                        <span className="text-[11px] font-bold text-white block">
                          {activeStation.platforms}
                        </span>
                        <span className="text-[10px] text-slate-400">Layout</span>
                      </div>

                      <div className="bg-[#101A27] border border-[#1F2E43] p-2 rounded-xl text-center">
                        <span className="material-symbols-outlined text-[#00D5E8] text-base mb-1 block mx-auto">
                          qr_code
                        </span>
                        <span className="text-[10px] font-bold text-white block truncate">{activeStation.code}</span>
                        <span className="text-[10px] text-slate-400">Code</span>
                      </div>

                      <div className="bg-[#101A27] border border-[#1F2E43] p-2 rounded-xl text-center">
                        <span className="material-symbols-outlined text-[#00D5E8] text-base mb-1 block mx-auto">
                          shuffle
                        </span>
                        <span className="text-[11px] font-bold text-white block">
                          {activeStation.lines.length} {activeStation.lines.length === 1 ? "line" : "lines"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {activeStation.isInterchange ? "Interchange" : "Line Corridor"}
                        </span>
                      </div>
                    </div>

                    {/* Address Card */}
                    <div className="bg-[#101A27] border border-[#1F2E43] p-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-[#00D5E8] shrink-0">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block truncate">{activeStation.address}</span>
                          <Link
                            href={`/plan?to=${encodeURIComponent(activeStation.name)}`}
                            className="text-[11px] text-[#00D5E8] hover:underline flex items-center gap-1"
                          >
                            <span>Plan journey to this station →</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Next Trains, Amenities, Nearby Places */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                  {/* Next Trains */}
                  <div className="bg-[#101A27] border border-[#1F2E43] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#1F2E43]/60">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-amber-400 text-base">schedule</span>
                          <h3 className="text-xs font-bold text-white">Next Trains</h3>
                        </div>
                        <Link href="/plan" className="text-[11px] text-[#00D5E8] hover:underline">
                          Live ETA
                        </Link>
                      </div>

                      <div className="mt-3 space-y-2">
                        {dynamicDepartures.map((dep, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 border-b border-[#1F2E43]/40 text-xs"
                          >
                            <div>
                              <span className="text-slate-300 block font-medium">{dep.towards}</span>
                              <span className="text-[10px] text-slate-500">{dep.line}</span>
                            </div>
                            <span className="font-bold text-[#00D5E8]">{dep.mins}</span>
                          </div>
                        ))}
                        {dynamicDepartures.length === 0 && (
                          <div className="text-xs text-slate-400 py-2">No live departures reported.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="bg-[#101A27] border border-[#1F2E43] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#1F2E43]/60">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#00D5E8] text-base">verified</span>
                          <h3 className="text-xs font-bold text-white">Amenities &amp; Services</h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-left">
                        {dynamicAmenities.map((am) => (
                          <div key={am.name} className="bg-[#0B1320] border border-[#1F2E43]/80 p-2 rounded-lg">
                            <span className="text-[11px] font-medium text-white block truncate" title={am.name}>
                              {am.name}
                            </span>
                            <span className="text-[10px] text-emerald-400">{am.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Nearby Places / Exits */}
                  <div className="bg-[#101A27] border border-[#1F2E43] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#1F2E43]/60">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#00D5E8] text-base">near_me</span>
                          <h3 className="text-xs font-bold text-white">Exits &amp; Access</h3>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {dynamicExits.map((poi, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 border-b border-[#1F2E43]/40 text-xs"
                          >
                            <span className="text-slate-300 truncate pr-2" title={poi.name}>{poi.name}</span>
                            <span className="text-white font-medium shrink-0">{poi.distance}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Loading Mumbai station details...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
