"use client";

import { useState, useCallback, useRef } from "react";
import { StationRef, JourneyResult } from "./JourneyPlannerTypes";

export type StationSuggestion = {
  id: string;
  name: string;
  code: string;
  city?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface JourneyPlannerProps {
  onJourneyCalculated?: (journey: JourneyResult | null) => void;
}

export function JourneyPlanner({ onJourneyCalculated }: JourneyPlannerProps) {
  const [selectedMode, setSelectedMode] = useState<"metro" | "bus" | "train" | "multimodal">("multimodal");
  const [fromQuery, setFromQuery] = useState("Kashmere Gate");
  const [toQuery, setToQuery] = useState("HUDA City Centre");
  const [fromStation, setFromStation] = useState<StationSuggestion | null>({
    id: "DELHI_KASHMERE_GATE",
    name: "Kashmere Gate",
    code: "KMT",
  });
  const [toStation, setToStation] = useState<StationSuggestion | null>({
    id: "DELHI_HUDA_CITY_CENTRE",
    name: "HUDA City Centre",
    code: "HCC",
  });

  const [loading, setLoading] = useState(false);
  const [activeJourney, setActiveJourney] = useState<JourneyResult | null>(null);

  const swapStations = () => {
    const tmpName = fromQuery;
    setFromQuery(toQuery);
    setToQuery(tmpName);

    const tmpStn = fromStation;
    setFromStation(toStation);
    setToStation(tmpStn);
  };

  const calculateJourney = async () => {
    if (!fromQuery || !toQuery) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/journeys?from=${encodeURIComponent(fromQuery)}&to=${encodeURIComponent(toQuery)}`
      );
      const data = await res.json();
      if (data?.journey) {
        setActiveJourney(data);
        if (onJourneyCalculated) onJourneyCalculated(data);
      }
    } catch {
      // Mock journey fallback for UI demonstration
      const mockResult: JourneyResult = {
        metadata: {
          from: { id: "1", name: fromQuery, code: "KG", lat: 28.6665, lng: 77.2332 },
          to: { id: "2", name: toQuery, code: "HC", lat: 28.4595, lng: 77.0725 },
          algorithm: "Dijkstra CTM v1.0",
          graphVersion: "1.0",
        },
        journey: {
          score: 95,
          duration: 32,
          durationSeconds: 1920,
          transfers: 2,
          legs: [
            {
              from: "1",
              fromStationName: fromQuery,
              to: "2",
              toStationName: "Central Secretariat",
              type: "TRANSIT",
              duration: 15,
              lineId: "red-line",
              lineName: "Red Line",
              lineColor: "#EF4444",
              lineCode: "RED",
              stationsCount: 4,
            },
            {
              from: "2",
              fromStationName: "Central Secretariat",
              to: "3",
              toStationName: toQuery,
              type: "TRANSIT",
              duration: 17,
              lineId: "yellow-line",
              lineName: "Yellow Line",
              lineColor: "#EAB308",
              lineCode: "YELLOW",
              stationsCount: 8,
            },
          ],
          stations: [
            { id: "1", name: fromQuery, code: "KG", lat: 28.6665, lng: 77.2332 },
            { id: "2", name: toQuery, code: "HC", lat: 28.4595, lng: 77.0725 },
          ],
          geojson: { type: "FeatureCollection", features: [] },
        },
      };
      setActiveJourney(mockResult);
      if (onJourneyCalculated) onJourneyCalculated(mockResult);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-5 flex flex-col h-full border border-white/10">
      <h3 className="text-[18px] font-semibold text-[#dfe2ee] mb-4">Plan a Journey</h3>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {(["metro", "bus", "train", "multimodal"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSelectedMode(mode)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
              selectedMode === mode
                ? "bg-[#c3f5ff]/20 text-[#c3f5ff] border border-[#c3f5ff]/40"
                : "bg-[#1c2028] text-[#bac9cc] border border-white/5 hover:bg-white/5"
            }`}
          >
            {mode === "multimodal" ? "⚡ Multi-Modal" : mode}
          </button>
        ))}
      </div>

      {/* Inputs Form */}
      <div className="space-y-4 relative">
        <div className="absolute left-[15px] top-[24px] bottom-[24px] w-0.5 bg-white/10 z-0"></div>

        {/* From */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#c3f5ff] ring-4 ring-[#080C14]"></div>
          <div className="flex-1 bg-[#31353e]/80 rounded-lg p-3 border border-white/5">
            <p className="text-[10px] text-[#bac9cc] mb-1 font-bold uppercase tracking-wider">From Station</p>
            <input
              value={fromQuery}
              onChange={(e) => setFromQuery(e.target.value)}
              className="bg-transparent border-none p-0 text-[14px] font-semibold text-[#dfe2ee] w-full focus:outline-none"
              placeholder="Enter Origin Station..."
            />
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={swapStations}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-[#1c2028] rounded-full border border-white/10 flex items-center justify-center text-[#bac9cc] hover:text-[#c3f5ff] transition-colors"
        >
          <span className="material-symbols-outlined text-sm">swap_vert</span>
        </button>

        {/* To */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-[#fec931] bg-[#080C14] ring-4 ring-[#080C14]"></div>
          <div className="flex-1 bg-[#31353e]/80 rounded-lg p-3 border border-white/5">
            <p className="text-[10px] text-[#bac9cc] mb-1 font-bold uppercase tracking-wider">To Destination</p>
            <input
              value={toQuery}
              onChange={(e) => setToQuery(e.target.value)}
              className="bg-transparent border-none p-0 text-[14px] font-semibold text-[#dfe2ee] w-full focus:outline-none"
              placeholder="Enter Destination Station..."
            />
          </div>
        </div>
      </div>

      {/* Quick Pills */}
      <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
        {["Home", "Work", "CSMT", "Airport T2"].map((place) => (
          <button
            key={place}
            onClick={() => setToQuery(place === "Home" ? "Andheri West" : place)}
            className="px-3 py-1 rounded-full bg-[#31353e] text-[12px] text-[#bac9cc] border border-white/5 hover:bg-white/10 transition-colors"
          >
            {place}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={calculateJourney}
        disabled={loading}
        className="w-full py-3 bg-[#c3f5ff] text-[#00363d] rounded-lg font-bold text-[16px] hover:bg-[#00daf3] transition-colors mt-auto shadow-[0_0_15px_rgba(0,229,255,0.2)]"
      >
        {loading ? "Calculating Pathfinder..." : "Search Routes"}
      </button>

      {/* Active Calculated Journey Output */}
      {activeJourney && (
        <div className="mt-6 pt-4 border-t border-white/10 space-y-3 animate-slide-in">
          <div className="flex justify-between items-center">
            <span className="text-[14px] font-bold text-[#c3f5ff]">Optimal Multimodal Path</span>
            <span className="text-[12px] px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-bold">
              Score: {activeJourney.journey.score}/100
            </span>
          </div>
          <div className="p-3 bg-[#181c24] rounded-lg border border-white/5 flex justify-between items-center text-[14px]">
            <div>
              <p className="font-bold text-[#dfe2ee]">{activeJourney.journey.duration} Mins Total</p>
              <p className="text-[12px] text-[#bac9cc]">{activeJourney.journey.transfers} Interchanges</p>
            </div>
            <span className="text-[16px] font-bold text-[#c3f5ff]">₹30</span>
          </div>
        </div>
      )}
    </div>
  );
}
