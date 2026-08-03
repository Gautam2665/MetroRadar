"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { CITY_METADATA } from "../page";

export default function LiveNetworkPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vehicles" | "lines" | "stations">("vehicles");

  const currentMeta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] relative h-full">
        <Header activeCity={activeCity} onCityChange={(city) => setActiveCity(city)} />

        {/* Live Network Operations Canvas */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* Top Control Bar */}
          <div className="bg-[#1c2028]/90 backdrop-blur-md px-6 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 z-20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] animate-pulse"></span>
                <h1 className="text-lg font-bold text-[#dfe2ee]">Live Network Telemetry</h1>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#c3f5ff]/10 border border-[#c3f5ff]/30 text-[#c3f5ff] text-xs font-bold">
                {currentMeta.name}
              </span>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00e5ff] text-base">directions_subway</span>
                <div>
                  <p className="text-[#bac9cc] leading-none">Active Trains</p>
                  <p className="text-sm font-bold text-[#dfe2ee]">42 Online</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4ade80] text-base">speed</span>
                <div>
                  <p className="text-[#bac9cc] leading-none">Avg Speed</p>
                  <p className="text-sm font-bold text-[#dfe2ee]">34.8 km/h</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#fec931] text-base">schedule</span>
                <div>
                  <p className="text-[#bac9cc] leading-none">On-Time Performance</p>
                  <p className="text-sm font-bold text-[#dfe2ee]">98.4%</p>
                </div>
              </div>
            </div>

            {/* View Mode Filters */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                onClick={() => setActiveTab("vehicles")}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeTab === "vehicles" ? "bg-[#00e5ff] text-[#001f24]" : "text-[#bac9cc] hover:text-[#dfe2ee]"
                }`}
              >
                Trains GTFS-RT
              </button>
              <button
                onClick={() => setActiveTab("lines")}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeTab === "lines" ? "bg-[#00e5ff] text-[#001f24]" : "text-[#bac9cc] hover:text-[#dfe2ee]"
                }`}
              >
                Line Geometry
              </button>
              <button
                onClick={() => setActiveTab("stations")}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeTab === "stations" ? "bg-[#00e5ff] text-[#001f24]" : "text-[#bac9cc] hover:text-[#dfe2ee]"
                }`}
              >
                Stations & Density
              </button>
            </div>
          </div>

          {/* Full Screen Live Map Container */}
          <div className="flex-1 relative w-full h-full">
            <MapContainer
              activeCity={activeCity}
              activeLayers={["lines", "stations", "realtime"]}
              selectedStationId={selectedStationId}
              onStationSelect={(id) => setSelectedStationId(id)}
            />

            {/* Floating Operations Drawer */}
            <div className="absolute top-6 left-6 w-80 glass-panel rounded-xl p-5 shadow-2xl z-20 border-white/10 bg-[#1c2028]/95 max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-[#dfe2ee]">Network Lines Telemetry</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#4ade80]/20 text-[#4ade80] font-bold">
                  LIVE STREAM
                </span>
              </div>

              <div className="space-y-4">
                {currentMeta.lines.map((line) => (
                  <div
                    key={line.name}
                    className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-2 hover:border-[#00e5ff]/30 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                          style={{
                            backgroundColor: line.color,
                            color: line.color === "#EAB308" ? "#000" : "#fff",
                          }}
                        >
                          {line.code}
                        </div>
                        <span className="text-xs font-bold text-[#dfe2ee]">{line.name}</span>
                      </div>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: line.status.includes("Delay") ? "#fec931" : "#4ade80" }}
                      >
                        {line.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#bac9cc] pt-1">
                      <div>
                        <span>Frequency: </span>
                        <span className="font-bold text-[#dfe2ee]">3.5 mins</span>
                      </div>
                      <div>
                        <span>Crowd Index: </span>
                        <span className="font-bold text-[#4ade80]">Normal</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
