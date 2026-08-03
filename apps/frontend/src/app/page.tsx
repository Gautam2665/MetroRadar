"use client";

import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { JourneyPlanner } from "../components/dashboard/JourneyPlanner";
import { DigitalTwinInspector, StationDetails } from "../components/dashboard/DigitalTwinInspector";
import MapContainer from "../components/map/MapContainer";
import { JourneyResult } from "../components/dashboard/JourneyPlannerTypes";

export const CITY_METADATA: Record<
  string,
  {
    name: string;
    code: string;
    operator: string;
    lines: { code: string; name: string; color: string; status: string }[];
    upcomingJourney: {
      from: string;
      to: string;
      inMin: number;
      platform: number;
      lineCode: string;
      lineColor: string;
    };
    quickPills: string[];
  }
> = {
  delhi: {
    name: "Delhi, IN",
    code: "DELHI",
    operator: "Delhi Metro Rail Corporation (DMRC)",
    lines: [
      { code: "R", name: "Red Line", color: "#EF4444", status: "Good Service" },
      { code: "V", name: "Violet Line", color: "#8B5CF6", status: "Good Service" },
      { code: "Y", name: "Yellow Line", color: "#EAB308", status: "Minor Delays" },
      { code: "B", name: "Blue Line", color: "#3B82F6", status: "Good Service" },
    ],
    upcomingJourney: {
      from: "Kashmere Gate",
      to: "HUDA City Centre",
      inMin: 12,
      platform: 2,
      lineCode: "Y",
      lineColor: "#EAB308",
    },
    quickPills: ["Kashmere Gate", "Rajiv Chowk", "HUDA City Centre", "IGI Airport T3"],
  },
  kochi: {
    name: "Kochi, KL",
    code: "KOCHI",
    operator: "Kochi Metro Rail Limited (KMRL)",
    lines: [
      { code: "C", name: "Cyan Line", color: "#00e5ff", status: "Good Service" },
      { code: "W", name: "Water Metro", color: "#00daf3", status: "Good Service" },
    ],
    upcomingJourney: {
      from: "Aluva",
      to: "SN Junction",
      inMin: 8,
      platform: 1,
      lineCode: "C",
      lineColor: "#00e5ff",
    },
    quickPills: ["Aluva", "Edapally", "MG Road", "Vytilla Water Hub"],
  },
  hyderabad: {
    name: "Hyderabad, IN",
    code: "HYDERABAD",
    operator: "L&T Metro Rail / HMRL",
    lines: [
      { code: "R", name: "Red Line (Miyapur - LB Nagar)", color: "#EF4444", status: "Good Service" },
      { code: "B", name: "Blue Line (Raidurg - Nagole)", color: "#3B82F6", status: "Good Service" },
      { code: "G", name: "Green Line (JBS - MGBS)", color: "#10B981", status: "Good Service" },
    ],
    upcomingJourney: {
      from: "Raidurg",
      to: "Secunderabad",
      inMin: 5,
      platform: 2,
      lineCode: "B",
      lineColor: "#3B82F6",
    },
    quickPills: ["Miyapur", "Raidurg", "LB Nagar", "Secunderabad"],
  },
  bengaluru: {
    name: "Bengaluru, IN",
    code: "BENGALURU",
    operator: "Bangalore Metro Rail Corporation (BMRCL)",
    lines: [
      { code: "P", name: "Purple Line", color: "#8B5CF6", status: "Good Service" },
      { code: "G", name: "Green Line", color: "#10B981", status: "Good Service" },
    ],
    upcomingJourney: {
      from: "Majestic (Nadaprabhu)",
      to: "Whitefield",
      inMin: 6,
      platform: 1,
      lineCode: "P",
      lineColor: "#8B5CF6",
    },
    quickPills: ["Majestic", "Whitefield", "Indiranagar", "MG Road"],
  },
  chennai: {
    name: "Chennai, IN",
    code: "CHENNAI",
    operator: "Chennai Metro Rail Limited (CMRL)",
    lines: [
      { code: "B", name: "Blue Line", color: "#3B82F6", status: "Good Service" },
      { code: "G", name: "Green Line", color: "#10B981", status: "Good Service" },
    ],
    upcomingJourney: {
      from: "Chennai Central",
      to: "Airport",
      inMin: 14,
      platform: 2,
      lineCode: "B",
      lineColor: "#3B82F6",
    },
    quickPills: ["Chennai Central", "Airport", "Guindy", "Koyambedu"],
  },
  ahmedabad: {
    name: "Ahmedabad, IN",
    code: "AHMEDABAD",
    operator: "Gujarat Metro Rail Corporation (GMRC)",
    lines: [
      { code: "B", name: "Blue Line (Thaltej - Vastral)", color: "#3B82F6", status: "Good Service" },
      { code: "R", name: "Red Line (APMC - Motera)", color: "#EF4444", status: "Good Service" },
    ],
    upcomingJourney: {
      from: "Old High Court",
      to: "Motera Stadium",
      inMin: 9,
      platform: 1,
      lineCode: "R",
      lineColor: "#EF4444",
    },
    quickPills: ["Old High Court", "Motera Stadium", "Thaltej", "Vastral Gam"],
  },
};

export default function DashboardPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedStation, setSelectedStation] = useState<StationDetails | null>(null);
  const [journeyResult, setJourneyResult] = useState<JourneyResult | null>(null);
  const [showNetworkStatus, setShowNetworkStatus] = useState(true);

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const handleStationSelect = (station: { id: string; name: string; code?: string; city?: string }) => {
    setSelectedStation({
      id: station.id,
      name: station.name,
      code: station.code || "STN",
      city: station.city || activeCity,
      lines: currentMeta.lines.map((l) => ({ code: l.code, color: l.color, name: l.name })),
      exits: [
        { gate: "Exit 1", name: `${station.name} Main Gate`, distanceMeters: 180 },
        { gate: "Exit 2", name: "Transit Concourse", distanceMeters: 120 },
        { gate: "Exit 3", name: "Feeder Bus Interchange", distanceMeters: 290 },
      ],
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        {/* Top Header */}
        <Header
          activeCity={activeCity}
          onCityChange={(city) => setActiveCity(city)}
          onSelectStation={(stn) =>
            handleStationSelect({ id: stn.id, name: stn.name, code: stn.code, city: stn.city })
          }
        />

        {/* Dashboard Canvas */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide">
          {/* Greeting Header */}
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-[32px] font-bold text-[#dfe2ee] flex items-center gap-2">
                Good Morning, Gautam <span className="text-2xl">👋</span>
              </h2>
              <p className="text-[16px] text-[#bac9cc]">
                {currentMeta.name} • {currentMeta.operator}
              </p>
            </div>
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-[#c3f5ff]/10 border border-[#c3f5ff]/30 text-[#c3f5ff] text-xs font-bold uppercase tracking-wider">
              {currentMeta.code} ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Map & Action Cards (8 cols on lg) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Map Card */}
              <div className="glass-card rounded-xl h-[420px] relative overflow-hidden p-0 flex flex-col border border-white/10">
                <div className="absolute top-4 left-4 z-10 bg-[#1c2028]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#c3f5ff] rounded-full animate-pulse"></div>
                  <span className="text-[14px] font-bold text-[#c3f5ff]">
                    {currentMeta.code} Live Telemetry
                  </span>
                </div>

                {/* Map Component */}
                <div className="w-full h-full relative">
                  <MapContainer
                    activeCity={activeCity}
                    activeLayers={["lines", "stations", "realtime"]}
                    onSelectStation={handleStationSelect}
                    highlightGeojson={journeyResult?.journey.geojson}
                  />
                </div>

                {/* Dynamic Network Status Overlay */}
                {showNetworkStatus && (
                  <div className="absolute top-4 right-4 w-72 glass-panel rounded-xl p-4 bg-[#1c2028]/90 z-20 border border-white/10 animate-slide-in">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[16px] font-bold text-[#dfe2ee]">
                        {currentMeta.code} Lines Status
                      </h3>
                      <button
                        onClick={() => setShowNetworkStatus(false)}
                        className="text-[#bac9cc] hover:text-[#dfe2ee] text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-3 text-[14px]">
                      {currentMeta.lines.map((line) => (
                        <div key={line.name} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: line.color, color: line.color === "#EAB308" ? "#000" : "#fff" }}
                            >
                              {line.code}
                            </div>
                            <span className="text-[#bac9cc] truncate max-w-[120px]">{line.name}</span>
                          </div>
                          <span
                            className="font-semibold"
                            style={{ color: line.status.includes("Delay") ? "#fec931" : "#c3f5ff" }}
                          >
                            {line.status} &gt;
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Dynamic Upcoming Journey */}
                <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-white/10">
                  <p className="text-[12px] text-[#bac9cc] mb-2 uppercase tracking-wider font-bold">
                    Upcoming Journey
                  </p>
                  <div>
                    <h4 className="text-[16px] font-bold text-[#dfe2ee]">{currentMeta.upcomingJourney.from}</h4>
                    <p className="text-[14px] text-[#bac9cc]">to {currentMeta.upcomingJourney.to}</p>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <p className="text-[12px] text-[#bac9cc]">
                      In {currentMeta.upcomingJourney.inMin} min • Platform {currentMeta.upcomingJourney.platform}
                    </p>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow"
                      style={{
                        backgroundColor: currentMeta.upcomingJourney.lineColor,
                        color: currentMeta.upcomingJourney.lineColor === "#EAB308" ? "#000" : "#fff",
                      }}
                    >
                      {currentMeta.upcomingJourney.lineCode}
                    </div>
                  </div>
                </div>

                {/* Smart Card Balance */}
                <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-white/10 hover:border-[#c3f5ff]/40 transition-colors">
                  <p className="text-[12px] text-[#bac9cc] mb-1 uppercase tracking-wider font-bold">
                    Smart Card Balance
                  </p>
                  <div>
                    <h3 className="text-[28px] font-bold text-[#dfe2ee]">₹256.40</h3>
                    <p className="text-[12px] text-[#bac9cc]">NCMC Standard</p>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <a href="/passes" className="text-[14px] text-[#c3f5ff] font-bold hover:underline">
                      View Passes
                    </a>
                    <span className="material-symbols-outlined text-[#bac9cc]">credit_card</span>
                  </div>
                </div>

                {/* CO2 Saved */}
                <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-white/10 hover:border-[#4ade80]/40 transition-colors">
                  <p className="text-[12px] text-[#bac9cc] mb-1 uppercase tracking-wider font-bold">CO₂ Saved</p>
                  <div>
                    <h3 className="text-[28px] font-bold text-[#dfe2ee]">
                      24.6 <span className="text-[14px] font-normal text-[#bac9cc]">kg</span>
                    </h3>
                    <p className="text-[12px] text-[#bac9cc]">≈ 1 Tree Planted</p>
                  </div>
                  <div className="flex justify-end mt-4">
                    <span className="material-symbols-outlined text-[#4ade80] text-2xl">eco</span>
                  </div>
                </div>

                {/* Money Saved */}
                <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-white/10 hover:border-[#c3f5ff]/40 transition-colors">
                  <p className="text-[12px] text-[#bac9cc] mb-1 uppercase tracking-wider font-bold">Money Saved</p>
                  <div>
                    <h3 className="text-[28px] font-bold text-[#dfe2ee]">₹1,320</h3>
                    <p className="text-[12px] text-[#bac9cc]">vs. Cab / Auto</p>
                  </div>
                  <div className="flex justify-end mt-4">
                    <span className="material-symbols-outlined text-[#c3f5ff] text-2xl">savings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Journey Planner Widget */}
            <div className="lg:col-span-4 flex flex-col h-full">
              <JourneyPlanner activeCity={activeCity} onJourneyCalculated={(res) => setJourneyResult(res)} />
            </div>
          </div>
        </main>
      </div>

      {/* Digital Twin Station Inspector Drawer */}
      <DigitalTwinInspector station={selectedStation} onClose={() => setSelectedStation(null)} />
    </div>
  );
}
