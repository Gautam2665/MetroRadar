"use client";

import { StationSearchInput } from "../StationSearchInput";

export type RouteLeg = {
  mode: string;
  line: string;
  color: string;
};

export type RouteOption = {
  id: string;
  duration: string;
  fare: string;
  smartCardFare?: string;
  distance: string;
  interchanges: number;
  walkDistance: string;
  crowd: string;
  crowdColor: string;
  boardCoach: string;
  score: number;
  legs: RouteLeg[];
};

export interface JourneyPlannerViewProps {
  activeCity: string;
  origin: string;
  destination: string;
  selectedMode: "metro" | "multimodal";
  activeRouteIndex: number;
  routes: RouteOption[];
  loading: boolean;
  onOriginChange: (val: string) => void;
  onDestinationChange: (val: string) => void;
  onSwap: () => void;
  onModeSelect: (mode: "metro" | "multimodal") => void;
  onRouteSelect: (index: number) => void;
  onSearchRoute: () => void;
}

export function JourneyPlannerView({
  activeCity,
  origin,
  destination,
  selectedMode,
  activeRouteIndex,
  routes,
  loading,
  onOriginChange,
  onDestinationChange,
  onSwap,
  onModeSelect,
  onRouteSelect,
  onSearchRoute,
}: JourneyPlannerViewProps) {
  return (
    <div className="p-6 flex flex-col gap-6 scrollbar-hide overflow-y-auto">
      {/* Mode Selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {(["metro", "multimodal"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onModeSelect(mode)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedMode === mode
                ? "bg-[#00e5ff] text-[#001f24] shadow"
                : "bg-white/5 text-[#dfe2ee] hover:bg-white/10 border border-white/10"
            }`}
          >
            {mode === "multimodal" ? "⚡ Multi-Modal (Cab/Auto)" : "METRO DIRECT"}
          </button>
        ))}
      </div>

      {/* Form Inputs */}
      <div className="relative flex flex-col gap-3">
        {/* Origin */}
        <div className="relative z-30">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#00e5ff] bg-transparent z-10"></span>
          <StationSearchInput
            value={origin}
            onChange={onOriginChange}
            activeCity={activeCity}
            placeholder="Origin Station"
            inputClassName="w-full bg-[#181c24] border border-white/10 rounded-xl py-3 pl-10 pr-12 text-[#dfe2ee] text-sm focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all placeholder:text-[#bac9cc]/50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bac9cc] text-xs font-bold uppercase pointer-events-none">
            From
          </span>
        </div>

        {/* Swap Button */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-40">
          <button
            onClick={onSwap}
            className="w-8 h-8 rounded-full bg-[#262a33] border border-white/10 flex items-center justify-center text-[#bac9cc] hover:text-[#00e5ff] transition-colors shadow-lg"
            title="Swap Origin & Destination"
          >
            <span className="material-symbols-outlined text-sm">swap_vert</span>
          </button>
        </div>

        {/* Destination */}
        <div className="relative z-20">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#ffb4ab] z-10"></span>
          <StationSearchInput
            value={destination}
            onChange={onDestinationChange}
            activeCity={activeCity}
            placeholder="Destination Station"
            inputClassName="w-full bg-[#181c24] border border-white/10 rounded-xl py-3 pl-10 pr-12 text-[#dfe2ee] text-sm focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all placeholder:text-[#bac9cc]/50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bac9cc] text-xs font-bold uppercase pointer-events-none">
            To
          </span>
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={onSearchRoute}
        disabled={loading}
        className="w-full py-3 bg-[#00e5ff] text-[#00363d] rounded-xl font-bold text-sm hover:bg-[#00daf3] transition-colors shadow-[0_0_15px_rgba(0,229,255,0.2)]"
      >
        {loading ? "Calculating Pathfinder..." : "Plan Journey"}
      </button>

      {/* Route Results List */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#dfe2ee] uppercase tracking-wider">
            Optimal Route Options ({routes.length})
          </h3>
          <span className="text-[11px] text-[#bac9cc]">Live Pathfinder</span>
        </div>

        {routes.map((route, idx) => (
          <div
            key={route.id}
            onClick={() => onRouteSelect(idx)}
            className={`glass-card rounded-xl p-4 cursor-pointer relative overflow-hidden transition-all border ${
              activeRouteIndex === idx
                ? "border-[#00e5ff]/60 shadow-[0_0_15px_rgba(0,229,255,0.2)] bg-white/5"
                : "border-white/5 hover:bg-white/5"
            }`}
          >
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="flex items-center gap-1.5 flex-wrap">
                {route.legs.map((leg, lIdx) => (
                  <div key={lIdx} className="flex items-center gap-1">
                    <div
                      className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm"
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

              {/* Route Score 0-100 Badge */}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-bold border border-[#10B981]/30">
                Score: {route.score}/100
              </span>
            </div>

            <div className="flex justify-between items-end border-t border-white/5 pt-3">
              <div>
                <span className="text-sm font-bold text-[#dfe2ee] block">{route.duration}</span>
                <span className="text-xs text-[#bac9cc]">
                  {selectedMode === "multimodal" ? "Direct Cab / Auto Ride" : `${route.interchanges} Transfers • ${route.walkDistance} walk`}
                </span>
              </div>
              {selectedMode === "multimodal" ? (
                <div className="text-right">
                  <span className="text-xs font-bold text-[#00e5ff] block">Cab: ₹140</span>
                  <span className="text-[11px] font-bold text-[#fec931] block">Auto: ₹85</span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-sm font-bold text-[#00e5ff] block">{route.fare}</span>
                  {route.smartCardFare && <span className="text-[10px] text-[#bac9cc] block">Card: {route.smartCardFare}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
