"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { CITY_METADATA } from "../page";

export default function LiveNetworkPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<"G" | "L1" | "L2">("L1");

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const currentStationName = currentMeta.upcomingJourney.from;

  const exitsList = [
    { gate: "Exit 1", name: "Ajmeri Gate Road", distance: "250m" },
    { gate: "Exit 2", name: "Daryaganj", distance: "120m" },
    { gate: "Exit 3", name: "Netaji Subhash Marg", distance: "300m" },
    { gate: "Exit 4", name: "Thana Street", distance: "180m" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        {/* Top Header */}
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Bento Grid Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-0 scrollbar-hide pb-20 md:pb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full">
            {/* Left Column: Station Map (Spans 8 cols on desktop) */}
            <div className="md:col-span-8 glass-card rounded-xl flex flex-col h-[50vh] md:h-full overflow-hidden relative border border-white/10">
              {/* Top Bar of Map Card */}
              <div className="p-4 flex justify-between items-center z-10 bg-gradient-to-b from-[#080C14]/80 to-transparent">
                <div className="hidden md:flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-[#dfe2ee] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00e5ff]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      location_on
                    </span>
                    {currentStationName}
                  </h2>
                  <div className="flex items-center gap-2 ml-4">
                    {currentMeta.lines.map((l) => (
                      <span
                        key={l.name}
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1"
                        style={{
                          backgroundColor: l.color,
                          color: l.color === "#EAB308" ? "#000" : "#fff",
                        }}
                      >
                        {l.code}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[#262a33] rounded-full px-3 py-1 border border-white/10">
                  <span className="text-xs text-[#bac9cc]">Map View</span>
                  <span className="material-symbols-outlined text-[#bac9cc] text-sm">expand_more</span>
                </div>
              </div>

              {/* Live Interactive Map */}
              <div className="flex-1 relative w-full h-full">
                <MapContainer
                  activeCity={activeCity}
                  activeLayers={["lines", "stations", "realtime"]}
                  selectedStationId={selectedStationId}
                  onStationSelect={(id) => setSelectedStationId(id)}
                />

                {/* Level / Floor Switcher Controls */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-[#31353e]/80 backdrop-blur-md rounded-lg p-1 border border-white/10 z-20">
                  {(["G", "L1", "L2"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setActiveLevel(lvl)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                        activeLevel === lvl
                          ? "bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 shadow"
                          : "text-[#bac9cc] hover:bg-white/10"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Map Legend (Bottom Overlay) */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-20 pointer-events-none">
                  <div className="flex gap-4 bg-[#31353e]/90 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 overflow-x-auto text-nowrap pointer-events-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></span>
                      <span className="text-[11px] text-[#bac9cc] font-bold">You are here</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-[#bac9cc]">door_open</span>
                      <span className="text-[11px] text-[#bac9cc]">Exit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-[#bac9cc]">elevator</span>
                      <span className="text-[11px] text-[#bac9cc]">Lift</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-[#bac9cc]">stairs</span>
                      <span className="text-[11px] text-[#bac9cc]">Stairs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-[#bac9cc]">wc</span>
                      <span className="text-[11px] text-[#bac9cc]">Restroom</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Details & Navigation (Spans 4 cols on desktop) */}
            <div className="md:col-span-4 flex flex-col gap-4">
              {/* Platform Guide Card */}
              <div className="glass-card rounded-xl p-5 flex flex-col gap-4 border border-white/10">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-[#dfe2ee] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#bac9cc] text-lg">subway</span>
                      Platform Guide
                    </h3>
                    <p className="text-xs text-[#bac9cc] mt-1">Platform 2 • {currentMeta.lines[0]?.name || "Yellow Line"}</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-[#262a33] flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-[#bac9cc] text-sm">arrow_forward_ios</span>
                  </button>
                </div>

                <div className="flex justify-between items-end mt-2">
                  <div>
                    <p className="text-xs text-[#bac9cc]">Next Train</p>
                    <p className="text-[32px] font-bold text-[#00e5ff] mt-1 leading-none">
                      {currentMeta.upcomingJourney.inMin} <span className="text-xl font-normal">min</span>
                    </p>
                    <p className="text-xs text-[#bac9cc] mt-1">Towards {currentMeta.upcomingJourney.to}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-[#bac9cc] mb-1">Crowd on Platform</p>
                    <div className="flex items-end gap-1 h-8">
                      <div className="w-2 bg-[#10B981] rounded-t-sm h-1/4"></div>
                      <div className="w-2 bg-[#10B981] rounded-t-sm h-1/3"></div>
                      <div className="w-2 bg-[#F59E0B] rounded-t-sm h-2/3"></div>
                      <div className="w-2 bg-[#F59E0B] rounded-t-sm h-3/4"></div>
                      <div className="w-2 bg-[#EF4444] rounded-t-sm h-full opacity-30"></div>
                      <div className="w-2 bg-[#EF4444] rounded-t-sm h-5/6 opacity-30"></div>
                    </div>
                    <p className="text-[11px] font-bold text-[#F59E0B] mt-1">Medium</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 mt-2">
                  <p className="text-xs text-[#bac9cc] mb-3">Best Boarding Zone</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-12 bg-[#31353e] rounded-lg border border-white/10 flex items-center justify-between px-2 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-[#00e5ff]/10"></div>
                      <span className="text-xs z-10 w-6 text-center text-[#bac9cc]">1</span>
                      <span className="text-xs z-10 w-6 text-center text-[#bac9cc]">2</span>
                      <span className="text-xs z-10 w-8 h-8 rounded-full bg-[#00e5ff] text-[#00363d] flex items-center justify-center font-bold border-2 border-[#080C14] shadow-[0_0_10px_rgba(0,218,243,0.3)]">
                        3
                      </span>
                      <span className="text-xs z-10 w-6 text-center text-[#bac9cc]">4</span>
                      <span className="text-xs z-10 w-6 text-center text-[#bac9cc]">5</span>
                      <span className="text-xs z-10 w-6 text-center text-[#bac9cc]">6</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-[#00e5ff] mt-2">Board Coach 3 • Less crowded</p>
                </div>
              </div>

              {/* Exits Card */}
              <div className="glass-card rounded-xl p-5 flex-1 flex flex-col border border-white/10 overflow-hidden">
                <h3 className="text-sm font-semibold text-[#dfe2ee] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#bac9cc] text-lg">door_open</span>
                  Exits & Interchanges
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
                  {exitsList.map((exit) => (
                    <div
                      key={exit.gate}
                      className="bg-[#1c2028]/50 rounded-lg p-3 border border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-[#dfe2ee]">{exit.gate}</h4>
                        <p className="text-xs text-[#bac9cc]">{exit.name}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-[#bac9cc] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">directions_walk</span> {exit.distance}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
