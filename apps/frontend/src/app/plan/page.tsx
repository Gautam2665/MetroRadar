"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { CITY_METADATA } from "../page";

export default function JourneyPlannerPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedMode, setSelectedMode] = useState("multimodal");
  const [origin, setOrigin] = useState("Kashmere Gate");
  const [destination, setDestination] = useState("HUDA City Centre");
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const routes = [
    {
      id: "route-1",
      duration: "32 min",
      fare: "₹30",
      smartCardFare: "₹27",
      distance: "18.6 km",
      interchanges: 2,
      walkDistance: "1.2 km",
      crowd: "Low",
      crowdColor: "#4ade80",
      boardCoach: "Coach 3",
      legs: [
        { mode: "subway", line: "Red Line", color: "#EF4444" },
        { mode: "subway", line: "Violet Line", color: "#8B5CF6" },
        { mode: "subway", line: "Yellow Line", color: "#EAB308" },
      ],
    },
    {
      id: "route-2",
      duration: "28 min",
      fare: "₹30",
      smartCardFare: "₹27",
      distance: "17.9 km",
      interchanges: 3,
      walkDistance: "900 m",
      crowd: "Medium",
      crowdColor: "#fec931",
      boardCoach: "Coach 2",
      legs: [
        { mode: "subway", line: "Red Line", color: "#EF4444" },
        { mode: "subway", line: "Violet Line", color: "#8B5CF6" },
        { mode: "walk", line: "Skywalk", color: "#849396" },
        { mode: "subway", line: "Yellow Line", color: "#EAB308" },
      ],
    },
    {
      id: "route-3",
      duration: "41 min",
      fare: "₹25",
      smartCardFare: "₹22.50",
      distance: "19.4 km",
      interchanges: 1,
      walkDistance: "400 m",
      crowd: "Low",
      crowdColor: "#4ade80",
      boardCoach: "Coach 1",
      legs: [
        { mode: "subway", line: "Yellow Line", color: "#EAB308" },
      ],
    },
  ];

  const currentRoute = routes[activeRouteIndex] || routes[0];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Split View Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left Panel: Search & Results */}
          <div className="w-full lg:w-[420px] flex-shrink-0 bg-[#0f131c]/90 backdrop-blur-md border-r border-white/10 flex flex-col h-full z-10 scrollbar-hide overflow-y-auto">
            {/* Search Form */}
            <div className="p-6 pb-4 border-b border-white/10">
              {/* Mode Selector */}
              <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
                {["metro", "bus", "train", "ferry", "multimodal"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedMode === mode
                        ? "bg-[#00e5ff] text-[#001f24]"
                        : "bg-white/5 text-[#dfe2ee] hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    {mode === "multimodal" ? "Multi-Modal" : mode.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Inputs */}
              <div className="relative flex flex-col gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#00e5ff] bg-transparent z-10"></span>
                  <input
                    className="w-full bg-[#181c24] border border-white/10 rounded-xl py-3 pl-10 pr-12 text-[#dfe2ee] text-sm focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all placeholder:text-[#bac9cc]/50"
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Origin Station"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bac9cc] text-xs font-bold uppercase">
                    From
                  </span>
                </div>

                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20">
                  <button
                    onClick={handleSwap}
                    className="w-8 h-8 rounded-full bg-[#262a33] border border-white/10 flex items-center justify-center text-[#bac9cc] hover:text-[#00e5ff] transition-colors shadow-lg"
                    title="Swap Origin & Destination"
                  >
                    <span className="material-symbols-outlined text-sm">swap_vert</span>
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#ffb4ab] z-10"></span>
                  <input
                    className="w-full bg-[#181c24] border border-white/10 rounded-xl py-3 pl-10 pr-12 text-[#dfe2ee] text-sm focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all placeholder:text-[#bac9cc]/50"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Destination Station"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bac9cc] text-xs font-bold uppercase">
                    To
                  </span>
                </div>
              </div>

              {/* Options Dropdowns */}
              <div className="flex gap-3 mt-4">
                <button className="flex-1 glass-panel rounded-lg py-2 px-3 flex items-center justify-between text-[#dfe2ee] hover:bg-white/5 transition-colors text-xs">
                  <span>Leave Now</span>
                  <span className="material-symbols-outlined text-sm text-[#bac9cc]">expand_more</span>
                </button>
                <button className="flex-1 glass-panel rounded-lg py-2 px-3 flex items-center justify-between text-[#dfe2ee] hover:bg-white/5 transition-colors text-xs">
                  <span>Preferences</span>
                  <span className="material-symbols-outlined text-sm text-[#bac9cc]">expand_more</span>
                </button>
              </div>

              <button className="w-full mt-4 bg-[#c3f5ff] text-[#00363d] rounded-xl py-3 text-sm font-bold hover:bg-[#9cf0ff] transition-colors shadow-lg">
                Search Routes
              </button>
            </div>

            {/* Results List */}
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-[#dfe2ee]">Recommended Routes</h2>
                <span className="text-xs text-[#bac9cc]">Based on live traffic & schedules</span>
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide pb-1">
                <button className="px-3 py-1 rounded-full bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 text-[10px] font-bold whitespace-nowrap">
                  Recommended
                </button>
                <button className="px-3 py-1 rounded-full glass-panel text-[#bac9cc] border border-white/5 text-[10px] hover:text-[#dfe2ee] whitespace-nowrap">
                  Fastest
                </button>
                <button className="px-3 py-1 rounded-full glass-panel text-[#bac9cc] border border-white/5 text-[10px] hover:text-[#dfe2ee] whitespace-nowrap">
                  Least Interchanges
                </button>
              </div>

              {/* Route Cards */}
              {routes.map((route, idx) => (
                <div
                  key={route.id}
                  onClick={() => setActiveRouteIndex(idx)}
                  className={`glass-panel rounded-xl p-4 cursor-pointer relative overflow-hidden transition-all ${
                    activeRouteIndex === idx
                      ? "border-[#00e5ff]/50 shadow-[0_0_15px_rgba(0,229,255,0.15)] bg-white/5"
                      : "border-white/5 hover:bg-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {route.legs.map((leg, lIdx) => (
                        <div key={lIdx} className="flex items-center gap-1">
                          <div
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm"
                            style={{
                              backgroundColor: leg.color,
                              color: leg.color === "#EAB308" ? "#000" : "#fff",
                            }}
                          >
                            <span className="material-symbols-outlined text-[10px]">
                              {leg.mode === "walk" ? "directions_walk" : "subway"}
                            </span>
                            {leg.line}
                          </div>
                          {lIdx < route.legs.length - 1 && (
                            <span className="material-symbols-outlined text-[#bac9cc] text-xs">
                              arrow_right_alt
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#dfe2ee]">{route.duration}</div>
                      <div className="text-xs text-[#00e5ff] font-bold">{route.fare}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex items-center text-xs text-[#bac9cc] gap-2">
                      <span>{route.interchanges} Interchanges</span>
                      <span className="w-1 h-1 rounded-full bg-white/20"></span>
                      <span>{route.walkDistance} walk</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: route.crowdColor }}>
                          <span className="material-symbols-outlined text-[14px]">groups</span> Crowd: {route.crowd}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[#00e5ff]">
                          <span className="material-symbols-outlined text-[14px]">verified</span> High Reliability
                        </span>
                      </div>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-[#dfe2ee] font-bold">
                        Board {route.boardCoach}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Map Canvas */}
          <div className="flex-1 relative bg-[#0a0e14]">
            {/* Live Interactive Map */}
            <div className="w-full h-full relative">
              <MapContainer
                activeCity={activeCity}
                activeLayers={["lines", "stations", "realtime"]}
                selectedStationId={selectedStationId}
                onStationSelect={(id) => setSelectedStationId(id)}
              />
            </div>

            {/* Floating Journey Summary Card */}
            <div className="absolute top-6 right-6 w-80 glass-panel rounded-xl p-5 shadow-2xl z-20 border-white/10 hidden xl:block bg-[#1c2028]/90">
              <h3 className="text-sm font-bold text-[#dfe2ee] mb-4">Journey Summary</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[#bac9cc] text-xs">Travel Time</span>
                  <span className="text-[#dfe2ee] text-sm font-bold">{currentRoute.duration}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[#bac9cc] text-xs">Distance</span>
                  <span className="text-[#dfe2ee] text-sm font-bold">{currentRoute.distance}</span>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                  <span className="text-[#bac9cc] text-xs">Fare</span>
                  <div className="text-right">
                    <span className="text-[#dfe2ee] text-sm font-bold block">{currentRoute.fare}</span>
                    <span className="text-[#bac9cc] text-[10px] block">(Smart Card: {currentRoute.smartCardFare})</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-[#00e5ff] bg-[#00e5ff]/10 p-2 rounded-lg border border-[#00e5ff]/20">
                    <span className="material-symbols-outlined text-sm">eco</span>
                    <span>CO₂ Saved: 1.8 kg</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#dfe2ee] bg-white/5 p-2 rounded-lg border border-white/5">
                    <span className="material-symbols-outlined text-sm text-[#fec931]">savings</span>
                    <span>Money Saved vs Cab: ₹120</span>
                  </div>
                </div>
                <button className="w-full mt-2 bg-white/10 text-[#dfe2ee] border border-white/20 rounded-lg py-2.5 text-xs font-bold hover:bg-white/20 transition-colors">
                  View Full Step-by-Step Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
