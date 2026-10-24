"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "../../components/Sidebar";
import { useCityContext } from "../../contexts/CityContext";
import { useAssistantUi } from "../../contexts/AssistantUiContext";
import { useLines } from "../../hooks/useLines";

export interface MetroLineStation {
  name: string;
  isTerminal?: boolean;
  interchangeBadges?: Array<{ text: string; bg: string; color: string; colorHex?: string }>;
}

export interface MetroLineData {
  id: string;
  code: string;
  name: string;
  badge: string;
  color: string;
  status: "Operational" | "Operational (Partial)" | "Under Construction";
  statusColor: string;
  route: string;
  stationsCount: number;
  lengthKm: string;
  travelTime: string;
  description: string;
  firstTrain: string;
  lastTrain: string;
  peakFrequency: string;
  offPeakFrequency: string;
  stations: MetroLineStation[];
}

function getLineBadge(code: string, name?: string): string {
  const c = (code || "").toUpperCase().replace(/_/g, "");
  if (c === "MONORAIL") return "Mono";
  if (c.startsWith("LINE")) return c.replace("LINE", "Line ");
  if (name) {
    const m = name.match(/Line\s+([0-9]+[A-Z]?)/i);
    if (m) return `Line ${m[1]}`;
  }
  return code || "Metro";
}

function formatTimeStr(timeStr?: string, fallback: string = "06:00 AM"): string {
  if (!timeStr) return fallback;
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (hours >= 24) hours = hours - 24;
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
}

export default function ExploreMetroLinesPage() {
  const { activeCity } = useCityContext();
  const { toggleAssistant } = useAssistantUi();
  const { lines: apiLines, loading } = useLines(activeCity);

  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("route");
  const [searchVal, setSearchVal] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Generate metro line list dynamically from GTFS database
  const linesList: MetroLineData[] = useMemo(() => {
    if (!apiLines || apiLines.length === 0) return [];

    return apiLines.map((line) => {
      const code = line.code || line.id;
      const colorHex = line.color || "#059DB2";
      const badge = getLineBadge(code, line.name);
      const rawStations = line.stations || [];

      const firstStation = rawStations[0]?.name || "Origin";
      const lastStation = rawStations[rawStations.length - 1]?.name || "Destination";
      const routeTitle = `${firstStation} ↔ ${lastStation}`;

      const stations: MetroLineStation[] = rawStations.map((st, idx) => {
        const isTerminal = idx === 0 || idx === rawStations.length - 1;
        const badges = (st.interchanges || []).map((ic) => ({
          text: getLineBadge(ic.code, ic.name),
          bg: ic.color || "#1E293B",
          color: "#FFFFFF",
          colorHex: ic.color || "#00D5E8",
        }));

        return {
          name: st.name,
          isTerminal,
          interchangeBadges: badges.length > 0 ? badges : undefined,
        };
      });

      const lengthKm = line.lengthKm ? `${line.lengthKm} km` : "—";
      const travelTime = line.travelTimeMinutes ? `~${line.travelTimeMinutes} mins` : "—";
      const firstTrain = formatTimeStr(line.firstTrain, "05:30 AM");
      const lastTrain = formatTimeStr(line.lastTrain, "11:30 PM");

      return {
        id: line.id || code,
        code,
        name: line.name || `Line ${code}`,
        badge,
        color: colorHex,
        status: "Operational",
        statusColor: "emerald",
        route: routeTitle,
        stationsCount: stations.length || line.stationsCount || 0,
        lengthKm,
        travelTime,
        description: `${line.name} connects ${firstStation} and ${lastStation} across ${stations.length || line.stationsCount || 0} stations with high-frequency transit.`,
        firstTrain,
        lastTrain,
        peakFrequency: "4–6 mins",
        offPeakFrequency: "8–12 mins",
        stations,
      };
    });
  }, [apiLines]);

  // Selected line instance
  const selectedLine = useMemo(() => {
    if (linesList.length === 0) return null;
    return (
      linesList.find((l) => l.id === selectedLineId || l.code === selectedLineId) ||
      linesList[0]
    );
  }, [linesList, selectedLineId]);

  const filteredLines = useMemo(() => {
    if (!searchVal.trim()) return linesList;
    const q = searchVal.toLowerCase();
    return linesList.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.route.toLowerCase().includes(q) ||
        l.stations.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [linesList, searchVal]);

  // Network overview counts (100% computed from dynamic data)
  const totalOperationalLines = linesList.filter((l) => l.status === "Operational").length;

  const totalStations = useMemo(() => {
    const allUnique = new Set<string>();
    linesList.forEach((l) =>
      l.stations.forEach((s) => allUnique.add(s.name.toLowerCase()))
    );
    return allUnique.size;
  }, [linesList]);

  const totalInterchanges = useMemo(() => {
    let count = 0;
    const seen = new Set<string>();
    linesList.forEach((l) =>
      l.stations.forEach((s) => {
        if (
          s.interchangeBadges &&
          s.interchangeBadges.length > 0 &&
          !seen.has(s.name.toLowerCase())
        ) {
          seen.add(s.name.toLowerCase());
          count++;
        }
      })
    );
    return count;
  }, [linesList]);

  const totalNetworkKm = useMemo(() => {
    const total = linesList.reduce((acc, l) => acc + (parseFloat(l.lengthKm) || 0), 0);
    return total > 0 ? `~${Math.round(total)}` : "—";
  }, [linesList]);

  // Extract interchange stations on current line
  const currentLineInterchanges = useMemo(() => {
    if (!selectedLine) return [];
    return selectedLine.stations.filter(
      (s) => s.interchangeBadges && s.interchangeBadges.length > 0
    );
  }, [selectedLine]);

  const hasAirportAccess = useMemo(() => {
    if (!selectedLine) return false;
    return selectedLine.stations.some(
      (s) =>
        s.name.toUpperCase().includes("CSMIA") ||
        s.name.toUpperCase().includes("AIRPORT")
    );
  }, [selectedLine]);

  return (
    <div className="bg-[#070B12] text-slate-200 font-sans antialiased h-screen overflow-hidden flex select-none">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:ml-16 h-full overflow-hidden">
        {/* Top Header */}
        <header
          className="h-16 border-b border-[#141F30] bg-[#080E18] px-3 sm:px-5 flex items-center justify-between shrink-0 z-30 gap-2 sm:gap-4 overflow-x-hidden"
          data-purpose="global-header"
        >
          {/* Search Bar */}
          <div className="flex-1 max-w-[200px] sm:max-w-xs md:max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
            <input
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-[#0E1726] border border-[#1E2E44] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00D5E8] focus:ring-1 focus:ring-[#00D5E8] transition-all"
              placeholder="Search line, station..."
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </div>

          {/* Right Header Status Widgets */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1726]/60 border border-[#1A283B] text-xs">
              <span className="material-symbols-outlined text-amber-400 text-sm">wb_sunny</span>
              <span className="font-semibold text-white">33°C</span>
              <span className="text-[11px] text-slate-400">Mumbai</span>
            </div>

            <button
              onClick={toggleAssistant}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#0E3B4F] to-[#0A2E44] border border-[#00D5E8]/40 hover:border-[#00D5E8] text-[#00D5E8] text-xs font-medium transition shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span className="hidden xs:inline">Transit AI</span>
            </button>

            {/* City Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1726]/60 border border-[#1A283B] text-xs text-slate-300">
              <span className="material-symbols-outlined text-[#00D5E8] text-sm">location_on</span>
              <span className="text-white font-medium">Mumbai, MH</span>
            </div>

            <div className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0E1726]/60 border border-[#1A283B] text-xs text-slate-300">
              <span>EN</span>
            </div>
          </div>
        </header>

        {/* Content Workspace Split (Left Column: Directory | Right Column: Details) */}
        <main className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN: Metro Line Directory */}
          <section
            className={`w-full md:w-[380px] lg:w-[420px] shrink-0 border-r border-[#141F30] bg-[#070B12] flex-col justify-between overflow-y-auto p-4 sm:p-5 scrollbar-hide pb-20 md:pb-5 ${
              mobileView === "detail" ? "hidden md:flex" : "flex"
            }`}
            data-purpose="lines-directory"
          >
            <div>
              {/* Header */}
              <div className="mb-4">
                <span className="text-[10px] tracking-wider uppercase font-bold text-[#00D5E8]">
                  EXPLORE NETWORK
                </span>
                <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">Mumbai Metro Lines</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Discover routes, stations and connections across Mumbai&apos;s metro network.
                </p>
              </div>

              {/* Lines Stack List */}
              <div className="space-y-2.5">
                {loading && linesList.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-500 animate-pulse">
                    Loading live transit network...
                  </div>
                )}

                {filteredLines.map((line) => {
                  const isSelected = selectedLine?.id === line.id || selectedLine?.code === line.code;
                  return (
                    <div
                      key={line.id}
                      onClick={() => {
                        setSelectedLineId(line.id);
                        setMobileView("detail");
                      }}
                      className={`p-3.5 rounded-xl cursor-pointer transition relative ${
                        isSelected
                          ? "bg-[#0F1B2B] border-2 border-[#00D5E8] shadow-md shadow-cyan-900/20"
                          : "bg-[#0B131E] border border-[#162232] hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow shrink-0"
                            style={{ backgroundColor: line.color }}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm"></span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{line.name}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                                  line.status === "Operational"
                                    ? "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                                    : "bg-amber-950/40 border border-amber-500/30 text-amber-400"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    line.status === "Operational" ? "bg-emerald-400" : "bg-amber-400"
                                  }`}
                                ></span>
                                {line.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5 font-medium truncate">{line.route}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <div className="text-right">
                            <span className="text-sm font-bold text-white block leading-none">
                              {line.stationsCount}
                            </span>
                            <span className="text-[10px] text-slate-400">stations</span>
                          </div>
                          <svg
                            className={`w-4 h-4 ${isSelected ? "text-[#00D5E8]" : "text-slate-500"}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Network Overview Stats */}
            <div className="mt-6 pt-4 border-t border-[#141F30]" data-purpose="network-overview">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                Mumbai Network Overview
              </h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-[#0D1522] border border-[#162232] rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-[#00D5E8] mb-0.5">
                    <span className="font-bold text-white text-sm">{totalOperationalLines}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Lines</span>
                  <span className="text-[8px] text-slate-500">(Operational)</span>
                </div>
                <div className="bg-[#0D1522] border border-[#162232] rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-[#00D5E8] mb-0.5">
                    <span className="font-bold text-white text-sm">{totalStations}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Stations</span>
                  <span className="text-[8px] text-slate-500">(In service)</span>
                </div>
                <div className="bg-[#0D1522] border border-[#162232] rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-purple-400 mb-0.5">
                    <span className="font-bold text-white text-sm">{totalInterchanges}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Interchanges</span>
                  <span className="text-[8px] text-slate-500">(Major hubs)</span>
                </div>
                <div className="bg-[#0D1522] border border-[#162232] rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-[#00D5E8] mb-0.5">
                    <span className="font-bold text-white text-sm">{totalNetworkKm}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Network</span>
                  <span className="text-[8px] text-slate-500">(km active)</span>
                </div>
              </div>

              {/* Official GTFS Timetable Note */}
              <div className="bg-[#0B131E] border border-[#162232] rounded-lg p-2.5 flex items-start gap-2.5 text-[10px] text-slate-400">
                <span className="material-symbols-outlined text-[#00D5E8] text-sm shrink-0 mt-0.5">info</span>
                <p>Line information reflects the active Mumbai GTFS timetable. Timings, routes and transfers are dynamically tracked from official schedules.</p>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Line Detail Panel */}
          {selectedLine ? (
            <section
              className={`flex-1 flex-col bg-[#070B12] overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-hide pb-24 md:pb-5 ${
                mobileView === "list" ? "hidden md:flex" : "flex"
              }`}
              data-purpose="line-detail-panel"
            >
              {/* Mobile Back Button to Directory */}
              <div className="md:hidden flex items-center justify-between pb-2 border-b border-[#18283E]">
                <button
                  onClick={() => setMobileView("list")}
                  className="flex items-center gap-1.5 text-xs text-[#00D5E8] font-semibold py-1.5 px-3 rounded-lg bg-[#0E1B2B] border border-cyan-500/30 hover:bg-[#14263B] transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back to all lines</span>
                </button>
                <span className="text-xs font-bold text-slate-400">{selectedLine.badge}</span>
              </div>
              {/* Header Banner Card */}
              <div
                className="bg-[#0D1625] border border-[#18283E] rounded-2xl p-5 shadow-lg relative overflow-hidden"
                data-purpose="line-summary-banner"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 shadow text-white"
                        style={{ backgroundColor: selectedLine.color }}
                      >
                        {selectedLine.badge}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                          selectedLine.status === "Operational"
                            ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-400"
                            : "bg-amber-950/80 border border-amber-500/40 text-amber-400"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            selectedLine.status === "Operational" ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        ></span>
                        {selectedLine.status}
                      </span>
                    </div>

                    <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{selectedLine.route}</h2>
                    <p className="text-xs text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
                      {selectedLine.description}
                    </p>
                  </div>

                  {/* Metric Stats */}
                  <div className="flex items-center gap-5 lg:gap-6 bg-[#080F1A] border border-[#142236] rounded-xl px-4 py-3 shrink-0">
                    <div className="text-center">
                      <span className="text-lg font-bold text-white block leading-tight">{selectedLine.stationsCount}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Stations</span>
                    </div>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <div className="text-center">
                      <span className="text-lg font-bold text-white block leading-tight">{selectedLine.lengthKm}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Length</span>
                    </div>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <div className="text-center">
                      <span className="text-lg font-bold text-white block leading-tight">{selectedLine.travelTime}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Est. travel time</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons in Banner */}
                <div className="mt-4 pt-3 flex items-center justify-end gap-3 border-t border-[#142337]">
                  <Link
                    href={`/plan?from=${encodeURIComponent(selectedLine.stations[0]?.name || "")}&to=${encodeURIComponent(selectedLine.stations[selectedLine.stations.length - 1]?.name || "")}`}
                    className="px-4 py-2 rounded-xl bg-[#00D5E8] hover:bg-cyan-300 text-slate-950 font-semibold text-xs flex items-center gap-2 transition shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    Plan Journey on {selectedLine.badge}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </Link>
                  <Link
                    href={`/network?line=${selectedLine.id}`}
                    className="px-4 py-2 rounded-xl bg-[#0E1A29] hover:bg-[#15253A] border border-[#1B2F48] text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    View on Map
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-[#141F30] flex items-center gap-8 text-xs font-medium text-slate-400 px-1">
                <button
                  onClick={() => setActiveTab("route")}
                  className={`flex items-center gap-2 py-2 transition cursor-pointer ${
                    activeTab === "route"
                      ? "text-[#00D5E8] border-b-2 border-[#00D5E8] font-semibold"
                      : "hover:text-slate-200"
                  }`}
                >
                  Route &amp; Stations
                </button>
                <button
                  onClick={() => setActiveTab("interchanges")}
                  className={`flex items-center gap-2 py-2 transition cursor-pointer ${
                    activeTab === "interchanges"
                      ? "text-[#00D5E8] border-b-2 border-[#00D5E8] font-semibold"
                      : "hover:text-slate-200"
                  }`}
                >
                  Interchanges ({currentLineInterchanges.length})
                </button>
                <button
                  onClick={() => setActiveTab("timings")}
                  className={`flex items-center gap-2 py-2 transition cursor-pointer ${
                    activeTab === "timings"
                      ? "text-[#00D5E8] border-b-2 border-[#00D5E8] font-semibold"
                      : "hover:text-slate-200"
                  }`}
                >
                  Timings &amp; Frequency
                </button>
                <button
                  onClick={() => setActiveTab("info")}
                  className={`flex items-center gap-2 py-2 transition cursor-pointer ${
                    activeTab === "info"
                      ? "text-[#00D5E8] border-b-2 border-[#00D5E8] font-semibold"
                      : "hover:text-slate-200"
                  }`}
                >
                  Key Information
                </button>
                <Link
                  href={`/network?line=${selectedLine.id}`}
                  className="flex items-center gap-2 py-2 hover:text-slate-200 transition cursor-pointer"
                >
                  Map View →
                </Link>
              </div>

              {/* Tab 1: Route & Stations */}
              {activeTab === "route" && (
                <>
                  {/* Dynamic Route Map Card */}
                  <div
                    className="relative h-64 w-full rounded-2xl overflow-hidden border border-[#162539] bg-[#09111C] shadow-inner flex items-center justify-center"
                    data-purpose="geographical-map-container"
                  >
                    {/* Cartographic Terrain Vectors */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none" preserveAspectRatio="none" viewBox="0 0 800 280">
                      <path d="M-10,0 L180,0 Q160,80 140,150 Q110,210 70,280 L-10,280 Z" fill="#0c1726" opacity="0.6"></path>
                      <path d="M180,0 Q160,80 140,150 Q110,210 70,280" stroke="#1d2e47" strokeDasharray="3,3" strokeWidth="2"></path>
                      <path d="M680,280 Q640,190 670,120 Q700,50 820,0" opacity="0.4" stroke="#18273d" strokeWidth="12"></path>
                      <path d="M120,40 L780,260" stroke="#152033" strokeWidth="2"></path>
                      <path d="M380,0 L360,280" stroke="#18273e" strokeWidth="3"></path>
                      <path d="M640,0 L610,280" stroke="#152033" strokeWidth="2"></path>
                    </svg>

                    {/* Dynamic Metro Line Path on Map */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 280">
                      <path
                        d="M120,135 Q300,120 400,140 T680,165"
                        fill="none"
                        opacity="0.3"
                        stroke={selectedLine.color}
                        strokeLinecap="round"
                        strokeWidth="10"
                      ></path>
                      <path
                        d="M120,135 Q300,120 400,140 T680,165"
                        fill="none"
                        stroke={selectedLine.color}
                        strokeLinecap="round"
                        strokeWidth="5"
                      ></path>
                      <path
                        d="M120,135 Q300,120 400,140 T680,165"
                        fill="none"
                        stroke="#FFFFFF"
                        opacity="0.8"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                      ></path>
                    </svg>

                    {/* Origin Terminal Marker */}
                    <div className="absolute left-[100px] top-[105px] flex flex-col items-center">
                      <span className="text-[12px] font-bold text-white tracking-wide drop-shadow-md">
                        {selectedLine.stations[0]?.name}
                      </span>
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg mt-1"
                        style={{ backgroundColor: selectedLine.color }}
                      ></div>
                      <span className="px-2 py-0.5 rounded bg-blue-600/90 text-[9px] text-white font-semibold mt-1">Origin</span>
                    </div>

                    {/* Mid Interchange Marker if present */}
                    {currentLineInterchanges[0] && (
                      <div className="absolute left-[380px] top-[95px] flex flex-col items-center">
                        <div className="flex items-center gap-1 mb-1">
                          {currentLineInterchanges[0].interchangeBadges?.map((b) => (
                            <span
                              key={b.text}
                              className="px-1.5 py-0.5 rounded text-[9px] font-extrabold shadow text-white"
                              style={{ backgroundColor: b.colorHex || "#00D5E8" }}
                            >
                              {b.text}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-white tracking-wide drop-shadow-md">
                          {currentLineInterchanges[0].name}
                        </span>
                        <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-md mt-1"></div>
                      </div>
                    )}

                    {/* Destination Terminal Marker */}
                    <div className="absolute right-[90px] top-[135px] flex flex-col items-center">
                      <span className="text-[12px] font-bold text-white tracking-wide drop-shadow-md">
                        {selectedLine.stations[selectedLine.stations.length - 1]?.name}
                      </span>
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg my-1"
                        style={{ backgroundColor: selectedLine.color }}
                      ></div>
                      <span className="px-2 py-0.5 rounded bg-emerald-600/90 text-[9px] text-white font-semibold">Terminal</span>
                    </div>

                    {/* Airport Access Badge if on corridor */}
                    {hasAirportAccess && (
                      <div className="absolute left-[260px] top-[180px] flex items-center gap-1.5 bg-purple-950/80 border border-purple-500/50 px-2.5 py-1 rounded-full shadow">
                        <span className="text-[10px] text-purple-200 font-semibold leading-tight">✈ CSMIA T1 &amp; T2 Direct Access</span>
                      </div>
                    )}
                  </div>

                  {/* Horizontal Schematic Route Diagram */}
                  <div className="bg-[#0B131E] border border-[#141F30] rounded-2xl p-4 shadow-sm" data-purpose="schematic-line-diagram">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        Stations <span className="text-slate-400 font-normal">({selectedLine.stations.length} sequential stops)</span>
                      </h3>
                      <span className="text-[11px] text-[#00D5E8]">Click station to view digital twin</span>
                    </div>

                    {/* Scrollable Schematic Strip */}
                    <div className="overflow-x-auto pb-4 pt-10 px-4 scrollbar-hide">
                      <div className="relative min-w-[920px] flex items-center justify-between">
                        {/* Track Line */}
                        <div
                          className="absolute left-6 right-6 h-1.5 rounded-full top-1/2 -translate-y-1/2 z-0 shadow-sm"
                          style={{ backgroundColor: selectedLine.color }}
                        ></div>

                        {/* Stations */}
                        {selectedLine.stations.map((st, idx) => {
                          return (
                            <Link
                              key={st.name + idx}
                              href={`/stations?search=${encodeURIComponent(st.name)}`}
                              className="relative z-10 flex flex-col items-center group cursor-pointer"
                            >
                              {st.interchangeBadges && (
                                <div className="absolute -top-11 flex items-center gap-1">
                                  {st.interchangeBadges.map((badge) => (
                                    <span
                                      key={badge.text}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-bold shadow text-white"
                                      style={{ backgroundColor: badge.colorHex || "#1E293B" }}
                                    >
                                      {badge.text}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {st.isTerminal ? (
                                <div
                                  className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-lg group-hover:scale-125 transition"
                                  style={{ backgroundColor: selectedLine.color }}
                                >
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                </div>
                              ) : (
                                <div
                                  className="w-3.5 h-3.5 rounded-full bg-white border-2 group-hover:scale-125 transition"
                                  style={{ borderColor: selectedLine.color }}
                                ></div>
                              )}

                              <div className="text-center mt-2.5 max-w-[75px]">
                                <span className="text-[10px] text-slate-300 font-medium leading-tight block group-hover:text-white transition">
                                  {st.name}
                                </span>
                                {st.isTerminal && (
                                  <span className="text-[9px] text-[#00D5E8] font-semibold uppercase block mt-0.5">
                                    Terminal
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Tab 2: Interchanges */}
              {activeTab === "interchanges" && (
                <div className="bg-[#0B131E] border border-[#141F30] rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00D5E8] text-base">shuffle</span>
                    <span>Interchange Connections on {selectedLine.name}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentLineInterchanges.map((st) => (
                      <div key={st.name} className="bg-[#101A27] border border-[#1F2E43] rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{st.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Direct multi-line interchange</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {st.interchangeBadges?.map((b) => (
                            <span
                              key={b.text}
                              className="px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm"
                              style={{ backgroundColor: b.colorHex || "#1E293B" }}
                            >
                              {b.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {currentLineInterchanges.length === 0 && (
                      <div className="text-xs text-slate-400 p-4">
                        No direct interchanges on this corridor.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Timings */}
              {activeTab === "timings" && (
                <div className="bg-[#0B131E] border border-[#141F30] rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00D5E8] text-base">schedule</span>
                    <span>Operating Timetable &amp; Headways ({selectedLine.name})</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-[#101A27] border border-[#1F2E43] p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">First Departure</span>
                      <span className="text-base font-bold text-white mt-1 block">{selectedLine.firstTrain}</span>
                    </div>
                    <div className="bg-[#101A27] border border-[#1F2E43] p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">Last Departure</span>
                      <span className="text-base font-bold text-white mt-1 block">{selectedLine.lastTrain}</span>
                    </div>
                    <div className="bg-[#101A27] border border-[#1F2E43] p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">Peak Headway</span>
                      <span className="text-base font-bold text-[#00D5E8] mt-1 block">{selectedLine.peakFrequency}</span>
                    </div>
                    <div className="bg-[#101A27] border border-[#1F2E43] p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">Off-Peak Headway</span>
                      <span className="text-base font-bold text-white mt-1 block">{selectedLine.offPeakFrequency}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Key Information */}
              {activeTab === "info" && (
                <div className="bg-[#0B131E] border border-[#141F30] rounded-2xl p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00D5E8] text-base">info</span>
                    <span>Corridor Profile ({selectedLine.name})</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedLine.description}</p>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="bg-[#101A27] border border-[#1F2E43] p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">Track Gauge</span>
                      <span className="text-xs font-bold text-white mt-1 block">1435 mm (Standard Gauge)</span>
                    </div>
                    <div className="bg-[#101A27] border border-[#1F2E43] p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">Electrification</span>
                      <span className="text-xs font-bold text-white mt-1 block">25 kV AC Overhead</span>
                    </div>
                    <div className="bg-[#101A27] border border-[#1F2E43] p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">Rolling Stock</span>
                      <span className="text-xs font-bold text-white mt-1 block">6 to 8 Coach Trainsets</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a metro line to view details
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
