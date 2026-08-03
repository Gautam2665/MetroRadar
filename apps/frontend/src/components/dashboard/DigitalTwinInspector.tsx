"use client";

import { useState } from "react";
import { X, MapPin, Train, DoorOpen } from "lucide-react";

export type StationDetails = {
  id: string;
  name: string;
  code: string;
  city?: string;
  lines?: { code: string; color: string; name: string }[];
  platforms?: { number: number; direction: string; nextTrainEtaMin: number; crowdLevel: string; bestCoach: number }[];
  exits?: { gate: string; name: string; distanceMeters: number }[];
};

interface DigitalTwinInspectorProps {
  station: StationDetails | null;
  onClose: () => void;
}

export function formatLineName(name: string | null) {
  if (!name) return "Metro";
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function DigitalTwinInspector({ station, onClose }: DigitalTwinInspectorProps) {
  const [selectedLevel, setSelectedLevel] = useState<"G" | "L1" | "L2">("L1");

  if (!station) return null;

  const defaultLines = station.lines && station.lines.length > 0
    ? station.lines
    : [
        { code: "RED", color: "#EF4444", name: "Red Line" },
        { code: "VIOLET", color: "#8B5CF6", name: "Violet Line" },
        { code: "YELLOW", color: "#EAB308", name: "Yellow Line" },
      ];

  const defaultExits = station.exits && station.exits.length > 0
    ? station.exits
    : [
        { gate: "Exit 1", name: "Ajmeri Gate Road", distanceMeters: 250 },
        { gate: "Exit 2", name: "Daryaganj", distanceMeters: 120 },
        { gate: "Exit 3", name: "Netaji Subhash Marg", distanceMeters: 300 },
        { gate: "Exit 4", name: "Thana Street", distanceMeters: 180 },
      ];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#0f131c]/95 backdrop-blur-2xl border-l border-white/10 z-50 p-6 overflow-y-auto flex flex-col gap-6 shadow-2xl animate-slide-in">
      {/* Header Bar */}
      <div className="flex justify-between items-start border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#c3f5ff]">location_on</span>
            <h2 className="text-[24px] font-bold text-[#dfe2ee]">{station.name}</h2>
          </div>
          <p className="text-[12px] text-[#bac9cc]">Station Code: {station.code || "KMT"}</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#dfe2ee] hover:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Connected Transit Lines */}
      <div className="flex items-center gap-2 flex-wrap">
        {defaultLines.map((line) => (
          <span
            key={line.code}
            className="px-3 py-1 rounded-full text-[12px] font-semibold flex items-center gap-1.5 shadow-md"
            style={{ backgroundColor: line.color, color: line.color === "#EAB308" ? "#000" : "#fff" }}
          >
            <span>●</span>
            {formatLineName(line.name)}
          </span>
        ))}
      </div>

      {/* 3D Isometric Map Visualizer & Controls */}
      <div className="glass-card rounded-xl p-4 relative overflow-hidden h-[240px] flex flex-col justify-between border border-white/10 bg-[#0B0F17]">
        <div className="flex justify-between items-center z-10">
          <span className="text-[12px] text-[#bac9cc] font-semibold">3D Station Twin Inspector</span>
          <div className="flex gap-1 bg-[#181c24] rounded-lg p-1 border border-white/10">
            {(["G", "L1", "L2"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`w-7 h-7 text-[12px] font-bold rounded ${
                  selectedLevel === lvl ? "bg-[#c3f5ff]/20 text-[#c3f5ff] border border-[#c3f5ff]/40" : "text-[#bac9cc] hover:bg-white/5"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Level Canvas Representation */}
        <div className="relative flex-1 flex items-center justify-center">
          <svg className="w-full h-full opacity-75" viewBox="0 0 400 160">
            <path d="M 50 120 L 200 40 L 350 120 L 200 150 Z" fill="none" stroke="#00daf3" strokeWidth="2" strokeDasharray="4,4" />
            <circle cx="200" cy="95" r="6" fill="#00daf3" />
            <text x="200" y="115" fill="#c3f5ff" fontSize="10" textAnchor="middle" fontWeight="bold">
              Level {selectedLevel} Platform Concourse
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-[10px] text-[#bac9cc] justify-around bg-black/40 p-2 rounded-lg border border-white/5">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#c3f5ff]"></span> You are here</span>
          <span className="flex items-center gap-1">🚪 Exits ({defaultExits.length})</span>
          <span className="flex items-center gap-1">🛗 Lifts</span>
          <span className="flex items-center gap-1">🪜 Escalators</span>
        </div>
      </div>

      {/* Platform Guide */}
      <div className="glass-card rounded-xl p-5 flex flex-col gap-4 border border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-[18px] font-semibold text-[#dfe2ee] flex items-center gap-2">
              <Train size={18} className="text-[#c3f5ff]" /> Platform Guide
            </h3>
            <p className="text-[14px] text-[#bac9cc] mt-1">Platform 2 • Yellow Line</p>
          </div>
        </div>

        <div className="flex justify-between items-end mt-2">
          <div>
            <p className="text-[14px] text-[#bac9cc]">Next Train</p>
            <p className="text-[32px] font-bold text-[#c3f5ff]">2 <span className="text-xl font-normal">min</span></p>
            <p className="text-[14px] text-[#bac9cc]">Towards HUDA City Centre</p>
          </div>
          <div className="text-right">
            <p className="text-[14px] text-[#bac9cc] mb-1">Platform Density</p>
            <div className="flex items-end gap-1 h-8">
              <div className="w-2 bg-[#10B981] rounded-t-sm h-1/4"></div>
              <div className="w-2 bg-[#10B981] rounded-t-sm h-1/3"></div>
              <div className="w-2 bg-[#F59E0B] rounded-t-sm h-2/3"></div>
              <div className="w-2 bg-[#F59E0B] rounded-t-sm h-3/4"></div>
              <div className="w-2 bg-[#EF4444] rounded-t-sm h-full opacity-30"></div>
            </div>
            <p className="text-[12px] font-bold text-[#F59E0B] mt-1">Medium</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 mt-2">
          <p className="text-[14px] text-[#bac9cc] mb-3">Best Boarding Zone</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-12 bg-[#31353e] rounded-lg border border-white/10 flex items-center justify-between px-3 relative overflow-hidden">
              <span className="text-[14px] text-[#bac9cc]">1</span>
              <span className="text-[14px] text-[#bac9cc]">2</span>
              <span className="w-8 h-8 rounded-full bg-[#c3f5ff] text-[#00363d] flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(0,229,255,0.4)]">
                3
              </span>
              <span className="text-[14px] text-[#bac9cc]">4</span>
              <span className="text-[14px] text-[#bac9cc]">5</span>
            </div>
          </div>
          <p className="text-[12px] text-[#c3f5ff] font-bold mt-2">Board Coach 3 • Less crowded</p>
        </div>
      </div>

      {/* Exit Gates */}
      <div className="glass-card rounded-xl p-5 flex flex-col border border-white/10">
        <h3 className="text-[18px] font-semibold text-[#dfe2ee] mb-4 flex items-center gap-2">
          <DoorOpen size={18} className="text-[#c3f5ff]" /> Physical Exit Gates
        </h3>
        <div className="space-y-3">
          {defaultExits.map((exit) => (
            <div
              key={exit.gate}
              className="bg-[#1c2028]/50 rounded-lg p-3 border border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="text-[16px] font-semibold text-[#dfe2ee]">{exit.gate}</h4>
                <p className="text-[14px] text-[#bac9cc]">{exit.name}</p>
              </div>
              <span className="text-[12px] font-bold text-[#bac9cc]">{exit.distanceMeters}m walk</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
