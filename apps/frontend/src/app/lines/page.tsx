"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "../../components/Sidebar";
import { useCityContext } from "../../contexts/CityContext";
import { useAssistantUi } from "../../contexts/AssistantUiContext";
import { useLines } from "../../hooks/useLines";
import { useStations } from "../../hooks/useStations";

export interface MetroLineStation {
  name: string;
  isTerminal?: boolean;
  interchangeBadges?: Array<{ text: string; bg: string; color: string }>;
}

export interface MetroLineData {
  id: string;
  code: string;
  name: string;
  badge: string;
  color: string;
  badgeBg: string;
  badgeText: string;
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

// Canonical stop sequences for Mumbai lines from GTFS / discrete dataset
const MUMBAI_LINE_STATION_SEQUENCES: Record<string, string[]> = {
  LINE1: [
    "Versova",
    "D. N. Nagar",
    "Azad Nagar",
    "Andheri",
    "Western Express Highway",
    "Chakala (J.B. Nagar)",
    "Airport Road",
    "Marol Naka",
    "Saki Naka",
    "Asalpha",
    "Jagruti Nagar",
    "Ghatkopar",
  ],
  LINE2A: [
    "Dahisar (East)",
    "Anand Nagar",
    "Kandarpada",
    "Mandapeshwar",
    "Eksar",
    "Borivali (West)",
    "Shimpoli",
    "Kandivali (West)",
    "Dahanukarwadi",
    "Valnai - Meeth Chowky",
    "Malad (West)",
    "Lower Malad",
    "Bangur Nagar",
    "Goregaon (West)",
    "Oshiwara",
    "Lower Oshiwara",
    "Andheri (West)",
  ],
  LINE3: [
    "Aarey JVLR",
    "SEEPZ",
    "MIDC",
    "Marol Naka",
    "CSMIA Terminal 2",
    "Sahar Road",
    "CSMIA Terminal 1",
    "Santacruz",
    "Bandra Colony",
    "BKC",
    "Dharavi",
    "Sitladevi",
    "Dadar Metro",
    "Siddhivinayak",
    "Worli",
    "Acharya Atre Chowk",
    "Science Centre",
    "Mahalaxmi",
    "Mumbai Central",
    "Grant Road",
    "Girgaon",
    "Kalbadevi",
    "CSMT Metro",
    "Hutatma Chowk",
    "Churchgate",
    "Vidhan Bhawan",
    "Cuffe Parade",
  ],
  LINE7: [
    "Kashigaon",
    "Miragaon",
    "Pandhurang Wadi",
    "Dahisar (East)",
    "Ovaripada",
    "Rashtriya Udyan",
    "Devipada",
    "Magathane",
    "Poisar",
    "Akurli",
    "Kurar",
    "Dindoshi",
    "Aarey",
    "Goregaon (East)",
    "Jogeshwari (East)",
    "Mogra",
    "Gundavali",
  ],
  LINE2B: [
    "Chembur",
    "Diamond Garden",
    "Shivaji Chowk",
    "BSNL Metro",
    "Mankhurd",
    "Mandale",
  ],
  MONORAIL: [
    "Chembur",
    "VNP & RC Marg Junction",
    "Fertiliser Township",
    "Bharat Petroleum",
    "Mysore Colony",
    "Bhakti Park",
    "Wadala Depot",
    "GTB Nagar",
    "Antop Hill",
    "Acharya Atre Nagar",
    "Wadala Bridge",
    "Dadar East",
    "Naigaon",
    "Ambedkar Nagar",
    "Mint Colony",
    "Lower Parel",
    "Sant Gadge Maharaj Chowk (Jacob Circle)",
  ],
};

const MUMBAI_LINE_METADATA: Record<
  string,
  {
    name: string;
    badge: string;
    color: string;
    badgeBg: string;
    badgeText: string;
    status: "Operational" | "Operational (Partial)" | "Under Construction";
    lengthKm: string;
    travelTime: string;
    description: string;
    firstTrain: string;
    lastTrain: string;
    peakFrequency: string;
    offPeakFrequency: string;
  }
> = {
  LINE1: {
    name: "Line 1",
    badge: "Line 1",
    color: "#007DC5",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
    status: "Operational",
    lengthKm: "11.4 km",
    travelTime: "~24 mins",
    description:
      "Blue Line 1 is Mumbai's pioneer metro line, linking western and eastern suburbs through Andheri, Marol, Saki Naka, and Ghatkopar.",
    firstTrain: "05:30 AM",
    lastTrain: "11:45 PM",
    peakFrequency: "4 mins",
    offPeakFrequency: "8 mins",
  },
  LINE2A: {
    name: "Line 2A",
    badge: "Line 2A",
    color: "#FACC15",
    badgeBg: "bg-amber-500",
    badgeText: "text-black",
    status: "Operational",
    lengthKm: "18.6 km",
    travelTime: "~36 mins",
    description:
      "Yellow Line connects Dahisar East with Andheri West along Link Road, serving Borivali, Kandivali, Malad, and Oshiwara.",
    firstTrain: "05:55 AM",
    lastTrain: "11:00 PM",
    peakFrequency: "6 mins",
    offPeakFrequency: "10 mins",
  },
  LINE3: {
    name: "Line 3",
    badge: "Line 3",
    color: "#059DB2",
    badgeBg: "bg-[#059DB2]",
    badgeText: "text-white",
    status: "Operational",
    lengthKm: "33.5 km",
    travelTime: "~50 mins",
    description:
      "Aqua Line is Mumbai's state-of-the-art underground rapid transit corridor running from Aarey JVLR via BKC, Airport terminals, and South Mumbai to Cuffe Parade.",
    firstTrain: "06:30 AM",
    lastTrain: "10:30 PM",
    peakFrequency: "6.5 mins",
    offPeakFrequency: "10 mins",
  },
  LINE7: {
    name: "Line 7",
    badge: "Line 7",
    color: "#E31E24",
    badgeBg: "bg-red-600",
    badgeText: "text-white",
    status: "Operational",
    lengthKm: "16.5 km",
    travelTime: "~35 mins",
    description:
      "Red Line runs directly elevated over the Western Express Highway (WEH), connecting Dahisar East, Kandivali, Goregaon, and Andheri East Gundavali.",
    firstTrain: "05:55 AM",
    lastTrain: "11:00 PM",
    peakFrequency: "6 mins",
    offPeakFrequency: "10 mins",
  },
  LINE2B: {
    name: "Line 2B",
    badge: "Line 2B",
    color: "#F0C800",
    badgeBg: "bg-yellow-500",
    badgeText: "text-black",
    status: "Operational",
    lengthKm: "5.8 km",
    travelTime: "~12 mins",
    description:
      "Yellow Line 2B phase connects Mandale Depot through Mankhurd and Diamond Garden to Chembur interchange.",
    firstTrain: "06:00 AM",
    lastTrain: "10:30 PM",
    peakFrequency: "8 mins",
    offPeakFrequency: "12 mins",
  },
  MONORAIL: {
    name: "Monorail",
    badge: "Mono",
    color: "#7C3AED",
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
    status: "Operational",
    lengthKm: "19.5 km",
    travelTime: "~42 mins",
    description:
      "Mumbai Monorail links Chembur on the harbour corridor with Jacob Circle (Sant Gadge Maharaj Chowk) via Wadala Depot and Lower Parel.",
    firstTrain: "06:15 AM",
    lastTrain: "10:00 PM",
    peakFrequency: "15 mins",
    offPeakFrequency: "20 mins",
  },
};

const LINE_BADGE_LOOKUP: Record<string, { text: string; bg: string; color: string }> = {
  LINE1: { text: "Line 1", bg: "bg-blue-600", color: "text-white" },
  LINE2A: { text: "2A", bg: "bg-amber-500", color: "text-black" },
  LINE3: { text: "Line 3", bg: "bg-[#059DB2]", color: "text-white" },
  LINE7: { text: "7", bg: "bg-red-600", color: "text-white" },
  LINE2B: { text: "2B", bg: "bg-yellow-500", color: "text-black" },
  MONORAIL: { text: "Mono", bg: "bg-purple-600", color: "text-white" },
};

export default function ExploreMetroLinesPage() {
  const { activeCity } = useCityContext();
  const { toggleAssistant } = useAssistantUi();
  const { lines: apiLines } = useLines(activeCity);
  const { data: apiStations } = useStations(activeCity);

  const [selectedLineId, setSelectedLineId] = useState<string>("LINE1");
  const [activeTab, setActiveTab] = useState<string>("route");
  const [searchVal, setSearchVal] = useState("");

  // Build interchange map from live stations data
  const interchangeMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!apiStations) return map;

    apiStations.forEach((st) => {
      const cityLower = (st.city || "").toLowerCase();
      if (cityLower !== "mumbai" && !st.code?.startsWith("STN_")) return;

      const normName = st.name.toLowerCase().trim();
      const lineCodes: string[] = (st.lines || [])
        .map((l: any) => (l.code || l.name || "").toUpperCase().replace(/\s+/g, ""))
        .filter(Boolean);

      if (lineCodes.length > 1) {
        map.set(normName, lineCodes);
      }
    });

    // Known interchanges fallback
    if (!map.has("andheri")) map.set("andheri", ["LINE1", "LINE2A", "LINE7"]);
    if (!map.has("andheri (west)")) map.set("andheri (west)", ["LINE2A", "LINE1"]);
    if (!map.has("d. n. nagar")) map.set("d. n. nagar", ["LINE2A", "LINE1"]);
    if (!map.has("western express highway")) map.set("western express highway", ["LINE1", "LINE7"]);
    if (!map.has("gundavali")) map.set("gundavali", ["LINE1", "LINE7"]);
    if (!map.has("dahisar (east)")) map.set("dahisar (east)", ["LINE2A", "LINE7"]);
    if (!map.has("marol naka")) map.set("marol naka", ["LINE1", "LINE3"]);
    if (!map.has("chembur")) map.set("chembur", ["MONORAIL", "LINE2B"]);

    return map;
  }, [apiStations]);

  // Generate canonical Mumbai metro lines dynamically
  const linesList: MetroLineData[] = useMemo(() => {
    // Recognized operational Mumbai line codes
    const recognizedCodes = ["LINE1", "LINE2A", "LINE3", "LINE7", "LINE2B", "MONORAIL"];

    return recognizedCodes.map((code) => {
      const meta = MUMBAI_LINE_METADATA[code];
      const stationNames = MUMBAI_LINE_STATION_SEQUENCES[code] || [];
      const firstStation = stationNames[0] || "Origin";
      const lastStation = stationNames[stationNames.length - 1] || "Destination";
      const routeTitle = `${firstStation} ↔ ${lastStation}`;

      // Check if backend returned live line properties
      const liveLine = (apiLines || []).find(
        (al) => al.code?.toUpperCase() === code || al.name?.toLowerCase().includes(meta.name.toLowerCase())
      );

      const colorHex = liveLine?.color || meta.color;

      const stations: MetroLineStation[] = stationNames.map((stName, idx) => {
        const isTerminal = idx === 0 || idx === stationNames.length - 1;
        const norm = stName.toLowerCase().trim();
        const connectedLines = interchangeMap.get(norm) || [];
        const otherLines = connectedLines.filter((c) => c !== code);

        const badges = otherLines
          .map((c) => LINE_BADGE_LOOKUP[c])
          .filter(Boolean);

        return {
          name: stName,
          isTerminal,
          interchangeBadges: badges.length > 0 ? badges : undefined,
        };
      });

      return {
        id: code,
        code,
        name: meta.name,
        badge: meta.badge,
        color: colorHex,
        badgeBg: meta.badgeBg,
        badgeText: meta.badgeText,
        status: meta.status,
        statusColor: "emerald",
        route: routeTitle,
        stationsCount: stations.length,
        lengthKm: meta.lengthKm,
        travelTime: meta.travelTime,
        description: meta.description,
        firstTrain: meta.firstTrain,
        lastTrain: meta.lastTrain,
        peakFrequency: meta.peakFrequency,
        offPeakFrequency: meta.offPeakFrequency,
        stations,
      };
    });
  }, [apiLines, interchangeMap]);

  const selectedLine = linesList.find((l) => l.id === selectedLineId) || linesList[0];

  const filteredLines = linesList.filter(
    (l) =>
      l.name.toLowerCase().includes(searchVal.toLowerCase()) ||
      l.route.toLowerCase().includes(searchVal.toLowerCase())
  );

  // Network overview counts
  const totalOperationalLines = linesList.filter((l) => l.status === "Operational").length;
  const totalStations = useMemo(() => {
    const allUnique = new Set<string>();
    linesList.forEach((l) => l.stations.forEach((s) => allUnique.add(s.name.toLowerCase())));
    return allUnique.size;
  }, [linesList]);

  const totalInterchanges = useMemo(() => {
    let count = 0;
    const seen = new Set<string>();
    linesList.forEach((l) =>
      l.stations.forEach((s) => {
        if (s.interchangeBadges && s.interchangeBadges.length > 0 && !seen.has(s.name.toLowerCase())) {
          seen.add(s.name.toLowerCase());
          count++;
        }
      })
    );
    return count;
  }, [linesList]);

  // Extract interchange stations on current line
  const currentLineInterchanges = useMemo(() => {
    return selectedLine.stations.filter((s) => s.interchangeBadges && s.interchangeBadges.length > 0);
  }, [selectedLine]);

  return (
    <div className="bg-[#070B12] text-slate-200 font-sans antialiased h-screen overflow-hidden flex select-none">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:ml-[260px] h-full overflow-hidden">
        {/* Top Header */}
        <header
          className="h-16 border-b border-[#141F30] bg-[#080E18] px-5 flex items-center justify-between shrink-0 z-30"
          data-purpose="global-header"
        >
          {/* Search Bar */}
          <div className="w-[380px] max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
            <input
              className="w-full pl-10 pr-4 py-2 bg-[#0E1726] border border-[#1E2E44] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00D5E8] focus:ring-1 focus:ring-[#00D5E8] transition-all"
              placeholder="Search for a line, route or station..."
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </div>

          {/* Right Header Status Widgets */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E1726]/60 border border-[#1A283B] text-xs">
              <span className="material-symbols-outlined text-amber-400 text-sm">wb_sunny</span>
              <span className="font-semibold text-white">33°C</span>
              <span className="text-[11px] text-slate-400">Mumbai, MH</span>
            </div>

            <button
              onClick={toggleAssistant}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#0E3B4F] to-[#0A2E44] border border-[#00D5E8]/40 hover:border-[#00D5E8] text-[#00D5E8] text-xs font-medium transition shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>Transit AI</span>
            </button>

            {/* City Indicator (Locked to Mumbai, MH) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E1726]/60 border border-[#1A283B] text-xs text-slate-300">
              <span className="material-symbols-outlined text-[#00D5E8] text-sm">location_on</span>
              <span className="text-white font-medium">Mumbai, MH</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0E1726]/60 border border-[#1A283B] text-xs text-slate-300">
              <span>EN</span>
            </div>

            <Link href="/alerts" className="relative p-2 rounded-lg bg-[#0E1726]/60 border border-[#1A283B] text-slate-400 hover:text-white">
              <span className="material-symbols-outlined text-base">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
            </Link>

            <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden">
              <span className="text-xs font-semibold text-slate-300">GM</span>
            </div>
          </div>
        </header>

        {/* Content Workspace Split (Left Column: Directory | Right Column: Details) */}
        <main className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN: Metro Line Directory */}
          <section
            className="w-[380px] lg:w-[420px] shrink-0 border-r border-[#141F30] bg-[#070B12] flex flex-col justify-between overflow-y-auto p-5 scrollbar-hide"
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
                {filteredLines.map((line) => {
                  const isSelected = line.id === selectedLineId;
                  return (
                    <div
                      key={line.id}
                      onClick={() => setSelectedLineId(line.id)}
                      className={`p-3.5 rounded-xl cursor-pointer transition relative ${
                        isSelected
                          ? "bg-[#0F1B2B] border-2 border-[#00D5E8] shadow-md shadow-cyan-900/20"
                          : "bg-[#0B131E] border border-[#162232] hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shadow shrink-0 ${line.badgeBg} ${line.badgeText}`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
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
                    <span className="font-bold text-white text-sm">~105</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Network</span>
                  <span className="text-[8px] text-slate-500">(km active)</span>
                </div>
              </div>

              {/* Official Disclaimer Note */}
              <div className="bg-[#0B131E] border border-[#162232] rounded-lg p-2.5 flex items-start gap-2.5 text-[10px] text-slate-400">
                <span className="material-symbols-outlined text-[#00D5E8] text-sm shrink-0 mt-0.5">info</span>
                <p>Line information reflects the active Mumbai GTFS timetable. Timings, routes and transfers are dynamically tracked.</p>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Line Detail Panel */}
          <section
            className="flex-1 flex flex-col bg-[#070B12] overflow-y-auto p-5 space-y-4 scrollbar-hide"
            data-purpose="line-detail-panel"
          >
            {/* Header Banner Card */}
            <div className="bg-[#0D1625] border border-[#18283E] rounded-2xl p-5 shadow-lg relative overflow-hidden" data-purpose="line-summary-banner">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-md ${selectedLine.badgeBg} ${selectedLine.badgeText} font-bold text-xs flex items-center gap-1.5 shadow`}>
                      {selectedLine.name}
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
                  Plan Journey on {selectedLine.name}
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
                          <span key={b.text} className={`px-1.5 py-0.5 rounded ${b.bg} ${b.color} text-[9px] font-extrabold shadow`}>
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

                  {/* Airport Hub Pill on Aqua Line 3 */}
                  {selectedLine.code === "LINE3" && (
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
                                    className={`px-1.5 py-0.5 rounded ${badge.bg} ${badge.color} text-[9px] font-bold shadow`}
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
                          <span key={b.text} className={`px-2 py-0.5 rounded text-xs font-bold ${b.bg} ${b.color}`}>
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
        </main>
      </div>
    </div>
  );
}
