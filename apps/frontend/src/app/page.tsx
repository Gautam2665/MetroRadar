"use client";

import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { JourneyPlanner } from "../components/dashboard/JourneyPlanner";
import { DigitalTwinInspector, StationDetails } from "../components/dashboard/DigitalTwinInspector";
import MapContainer from "../components/map/MapContainer";
import { JourneyResult } from "../components/dashboard/JourneyPlannerTypes";

export default function DashboardPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedStation, setSelectedStation] = useState<StationDetails | null>(null);
  const [journeyResult, setJourneyResult] = useState<JourneyResult | null>(null);
  const [showNetworkStatus, setShowNetworkStatus] = useState(true);

  const handleStationSelect = (station: { id: string; name: string; code?: string; city?: string }) => {
    setSelectedStation({
      id: station.id,
      name: station.name,
      code: station.code || "STN",
      city: station.city || activeCity,
      lines: [
        { code: "RED", color: "#EF4444", name: "Red Line" },
        { code: "VIOLET", color: "#8B5CF6", name: "Violet Line" },
        { code: "YELLOW", color: "#EAB308", name: "Yellow Line" },
      ],
      exits: [
        { gate: "Exit 1", name: "Main Gate Road", distanceMeters: 250 },
        { gate: "Exit 2", name: "Concourse Concourse", distanceMeters: 120 },
        { gate: "Exit 3", name: "Bus Terminal Interchange", distanceMeters: 300 },
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
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Dashboard Canvas */}
        <main className="flex-1 overflow-y-auto p-6 relative z-0 scrollbar-hide">
          {/* Greeting Header */}
          <div className="mb-8">
            <h2 className="text-[32px] font-bold text-[#dfe2ee] flex items-center gap-2">
              Good Morning, Gautam <span className="text-2xl">👋</span>
            </h2>
            <p className="text-[16px] text-[#bac9cc]">Your city, connected.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Map & Action Cards (8 cols on lg) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Map Card */}
              <div className="glass-card rounded-xl h-[420px] relative overflow-hidden p-0 flex flex-col border border-white/10">
                <div className="absolute top-4 left-4 z-10 bg-[#1c2028]/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#c3f5ff] rounded-full animate-pulse"></div>
                  <span className="text-[14px] font-bold text-[#c3f5ff]">Live Telemetry</span>
                </div>

                {/* Map Component */}
                <div className="w-full h-full relative">
                  <MapContainer
                    activeCity={activeCity}
                    activeLayers={["lines", "stations", "vehicles"]}
                    onSelectStation={handleStationSelect}
                    highlightGeojson={journeyResult?.journey.geojson}
                  />
                </div>

                {/* Network Status Overlay within Map Card */}
                {showNetworkStatus && (
                  <div className="absolute top-4 right-4 w-72 glass-panel rounded-xl p-4 bg-[#1c2028]/90 z-20 border border-white/10 animate-slide-in">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[16px] font-bold text-[#dfe2ee]">Network Status</h3>
                      <button
                        onClick={() => setShowNetworkStatus(false)}
                        className="text-[#bac9cc] hover:text-[#dfe2ee] text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-3 text-[14px]">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#93000a] flex items-center justify-center text-[10px] font-bold text-[#ffdad6]">
                            R
                          </div>
                          <span className="text-[#bac9cc]">Red Line</span>
                        </div>
                        <span className="text-[#c3f5ff] font-semibold">Good Service &gt;</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#7000ff] flex items-center justify-center text-[10px] font-bold text-[#ddcdff]">
                            V
                          </div>
                          <span className="text-[#bac9cc]">Violet Line</span>
                        </div>
                        <span className="text-[#c3f5ff] font-semibold">Good Service &gt;</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#fec931] flex items-center justify-center text-[10px] font-bold text-[#6f5500]">
                            Y
                          </div>
                          <span className="text-[#bac9cc]">Yellow Line</span>
                        </div>
                        <span className="text-[#fec931] font-semibold">Minor Delays &gt;</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Cards (4 Grid Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Upcoming Journey */}
                <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-white/10">
                  <p className="text-[12px] text-[#bac9cc] mb-2 uppercase tracking-wider font-bold">Upcoming Journey</p>
                  <div>
                    <h4 className="text-[16px] font-bold text-[#dfe2ee]">Kashmere Gate</h4>
                    <p className="text-[14px] text-[#bac9cc]">to HUDA City Centre</p>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <p className="text-[12px] text-[#bac9cc]">In 23 min • Platform 2</p>
                    <div className="w-6 h-6 rounded-full bg-[#EF4444] flex items-center justify-center text-white font-bold text-xs">
                      2
                    </div>
                  </div>
                </div>

                {/* Smart Card Balance */}
                <div className="glass-card rounded-xl p-4 flex flex-col justify-between border border-white/10 hover:border-[#c3f5ff]/40 transition-colors">
                  <p className="text-[12px] text-[#bac9cc] mb-1 uppercase tracking-wider font-bold">Smart Card Balance</p>
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

            {/* Right Column: Plan Journey Widget (4 cols on lg) */}
            <div className="lg:col-span-4 flex flex-col h-full">
              <JourneyPlanner onJourneyCalculated={(res) => setJourneyResult(res)} />
            </div>
          </div>
        </main>
      </div>

      {/* Digital Twin Station Inspector Drawer */}
      <DigitalTwinInspector station={selectedStation} onClose={() => setSelectedStation(null)} />
    </div>
  );
}
