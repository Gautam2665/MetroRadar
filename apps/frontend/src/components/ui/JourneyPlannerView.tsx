"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StationSearchInput, StationItem } from "../StationSearchInput";
import { RouteOption, RouteLeg } from "../../containers/JourneyPlannerContainer";

export type { RouteOption, RouteLeg };

export interface JourneyPlannerViewProps {
  activeCity: string;
  origin: string;
  destination: string;
  originId: string | null;
  destinationId: string | null;
  activeRouteIndex: number;
  routes: RouteOption[];
  loading: boolean;
  error: string | null;
  onOriginChange: (val: string) => void;
  onDestinationChange: (val: string) => void;
  onSelectOriginStation: (station: StationItem) => void;
  onSelectDestinationStation: (station: StationItem) => void;
  onSwap: () => void;
  onRouteSelect: (index: number) => void;
  onSearchRoute: () => void;
}

/** Compact leg visualizer used in the card summary row */
function LegPills({ legs }: { legs: RouteLeg[] }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {legs.map((leg, i) => (
        <span key={i} className="flex items-center gap-1">
          {leg.mode === "walk" ? (
            <span className="flex items-center gap-0.5 text-[10px] text-[#bac9cc] bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
              <span className="material-symbols-outlined text-[11px]">directions_walk</span>
              {leg.durationMins && <span>{leg.durationMins}m</span>}
            </span>
          ) : (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1"
              style={{
                backgroundColor: `${leg.color}25`,
                color: leg.color,
                border: `1px solid ${leg.color}60`,
                boxShadow: `0 0 10px ${leg.color}20`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: leg.color }} />
              {leg.line}
            </span>
          )}
          {i < legs.length - 1 && leg.mode !== "walk" && legs[i + 1]?.mode !== "walk" && (
            <span className="text-[#bac9cc]/60 text-[10px] mx-0.5">→</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Expanded step-by-step itinerary for a route */
function RouteItinerary({ route, origin, destination }: { route: RouteOption; origin: string; destination: string }) {
  const steps: { icon: string; color: string; title: string; subtitle: string }[] = [];

  let firstMetro = true;
  for (const leg of route.legs) {
    if (leg.mode === "walk") {
      steps.push({
        icon: "directions_walk",
        color: "#bac9cc",
        title: `Walk ${leg.durationMins ? `${leg.durationMins} min` : ""}`,
        subtitle: "Walk to platform",
      });
    } else {
      if (firstMetro) {
        steps.push({
          icon: "trip_origin",
          color: "#22c55e",
          title: origin,
          subtitle: `Board ${leg.line}${
            leg.fromStation ? ` from ${leg.fromStation}` : ""
          }`,
        });
        firstMetro = false;
      }
      if (leg.stopsCount) {
        steps.push({
          icon: "subway",
          color: leg.color,
          title: `${leg.line}`,
          subtitle: `${leg.stopsCount} stops${leg.durationMins ? ` · ${leg.durationMins} min` : ""}${
            leg.toStation ? ` → ${leg.toStation}` : ""
          }`,
        });
      }
    }
  }

  // Alight at destination
  steps.push({
    icon: "location_on",
    color: "#ef4444",
    title: destination,
    subtitle: `Arrive · ${route.duration}`,
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3 pt-3 border-t border-white/10 space-y-2.5"
    >
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-2.5 text-xs"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${step.color}25`, border: `1px solid ${step.color}60` }}
            >
              <span className="material-symbols-outlined text-xs" style={{ color: step.color }}>
                {step.icon}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-[#dfe2ee] leading-tight">{step.title}</p>
              <p className="text-[11px] text-[#bac9cc] mt-0.5 leading-tight">{step.subtitle}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Board coach tip */}
      {route.boardCoach && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#fec931]/10 border border-[#fec931]/30 rounded-xl backdrop-blur-md">
          <span className="material-symbols-outlined text-[#fec931] text-sm">train</span>
          <p className="text-[11px] text-[#fec931] font-semibold">Board {route.boardCoach} · nearest to exit</p>
        </div>
      )}
    </motion.div>
  );
}

export function JourneyPlannerView({
  activeCity,
  origin,
  destination,
  originId,
  destinationId,
  activeRouteIndex,
  routes,
  loading,
  error,
  onOriginChange,
  onDestinationChange,
  onSelectOriginStation,
  onSelectDestinationStation,
  onSwap,
  onRouteSelect,
  onSearchRoute,
}: JourneyPlannerViewProps) {
  const canSearch = !!originId && !!destinationId && originId !== destinationId;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleCardClick = (idx: number) => {
    onRouteSelect(idx);
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d13]/90 backdrop-blur-2xl border-r border-white/10">
      {/* ── Input Section ──────────────────────────────── */}
      <div className="p-5 space-y-3 bg-[#0d1117]/80 border-b border-white/10 shadow-lg">
        {/* Origin + Destination inputs */}
        <div className="relative">
          {/* Connecting line between dots */}
          <div className="absolute left-[14px] top-[28px] h-[calc(100%-28px)] w-px bg-gradient-to-b from-[#22c55e] to-[#ef4444] z-0" />

          {/* Origin */}
          <div className="relative flex items-center gap-3 mb-2 z-30">
            <div className="w-3 h-3 rounded-full bg-[#22c55e] border-2 border-[#080C14] flex-shrink-0 z-10 shadow-[0_0_10px_#22c55e]" />
            <StationSearchInput
              value={origin}
              onChange={onOriginChange}
              onSelectStation={onSelectOriginStation}
              activeCity={activeCity}
              placeholder="From — origin station"
              inputClassName="w-full bg-[#141822]/90 border border-white/12 rounded-xl py-2.5 pl-3.5 pr-10 text-[#dfe2ee] text-sm focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all placeholder:text-[#bac9cc]/40 shadow-inner"
            />
          </div>

          {/* Swap button */}
          <button
            onClick={onSwap}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full bg-[#181d28] border border-white/15 flex items-center justify-center text-[#bac9cc] hover:text-[#00e5ff] hover:border-[#00e5ff]/50 transition-all shadow-md active:scale-95"
            title="Swap"
          >
            <span className="material-symbols-outlined text-sm">swap_vert</span>
          </button>

          {/* Destination */}
          <div className="relative flex items-center gap-3 z-20">
            <div className="w-3 h-3 rounded-full bg-[#ef4444] border-2 border-[#080C14] flex-shrink-0 z-10 shadow-[0_0_10px_#ef4444]" />
            <StationSearchInput
              value={destination}
              onChange={onDestinationChange}
              onSelectStation={onSelectDestinationStation}
              activeCity={activeCity}
              placeholder="To — destination station"
              inputClassName="w-full bg-[#141822]/90 border border-white/12 rounded-xl py-2.5 pl-3.5 pr-10 text-[#dfe2ee] text-sm focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all placeholder:text-[#bac9cc]/40 shadow-inner"
            />
          </div>
        </div>

        {/* Hint when UUIDs not set */}
        {(!originId || !destinationId) && (
          <p className="text-[11px] text-[#bac9cc]/60 flex items-center gap-1 px-1">
            <span className="material-symbols-outlined text-[11px] text-[#00e5ff]">info</span>
            Pick stations from the dropdown list to calculate path
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        {/* Plan button */}
        <button
          onClick={() => { onSearchRoute(); setExpandedIndex(null); }}
          disabled={loading || !canSearch}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
            canSearch && !loading
              ? "bg-[#00e5ff] text-[#001f24] hover:bg-[#33ebff] shadow-[0_0_20px_rgba(0,229,255,0.35)] active:scale-[0.99]"
              : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-[#001f24] border-t-transparent rounded-full animate-spin" />
              Calculating Dijkstra route...
            </span>
          ) : canSearch ? "Get Directions →" : "Select stations above"}
        </button>
      </div>

      {/* ── Route Cards ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-3">
        {/* Loading skeleton animation */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 bg-[#141822]/80 border border-white/10 rounded-2xl animate-pulse space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-white/10 rounded-lg" />
                  <div className="h-5 w-16 bg-white/10 rounded-lg" />
                </div>
                <div className="h-3 w-40 bg-white/5 rounded-lg" />
                <div className="h-6 w-full bg-white/5 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {!loading && routes.length > 0 && (
          <p className="text-[10px] font-bold text-[#bac9cc] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>{routes.length} Route{routes.length !== 1 ? "s" : ""} Available</span>
            <span className="text-[#00e5ff]">Metro Network</span>
          </p>
        )}

        {!loading && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="space-y-3"
          >
            {routes.map((route, idx) => {
              const isSelected = activeRouteIndex === idx;
              const isExpanded = expandedIndex === idx;

              return (
                <motion.div
                  key={route.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className={`rounded-2xl border transition-all overflow-hidden backdrop-blur-xl ${
                    isSelected
                      ? "border-[#00e5ff]/50 bg-[#00e5ff]/8 shadow-[0_0_25px_rgba(0,229,255,0.12)]"
                      : "border-white/10 bg-[#141822]/70 hover:border-white/20 hover:bg-[#141822]/90"
                  }`}
                >
                  {/* Card summary — always visible */}
                  <button
                    className="w-full text-left p-4 cursor-pointer"
                    onClick={() => handleCardClick(idx)}
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      {/* Left: label + duration */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-[#001f24] shadow-sm ${
                              idx === 0 ? "bg-[#00e5ff]" : idx === 1 ? "bg-[#8B5CF6] text-white" : "bg-[#fec931]"
                            }`}
                          >
                            {route.label}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-[#00e5ff] font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />
                              Active Route
                            </span>
                          )}
                        </div>
                        <p className="text-xl font-black text-[#dfe2ee] leading-none">{route.duration}</p>
                      </div>
                      {/* Right: fare + expand chevron */}
                      <div className="flex items-start gap-2">
                        <div className="text-right">
                          <p className="text-base font-bold text-[#dfe2ee]">{route.fare}</p>
                          {route.smartCardFare && (
                            <p className="text-[10px] text-[#4ade80]">Card {route.smartCardFare}</p>
                          )}
                        </div>
                        <span
                          className={`material-symbols-outlined text-[#bac9cc] text-sm mt-0.5 transition-transform ${
                            isExpanded ? "rotate-180 text-[#00e5ff]" : ""
                          }`}
                        >
                          expand_more
                        </span>
                      </div>
                    </div>

                    {/* Leg pills */}
                    <LegPills legs={route.legs} />

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-[#bac9cc]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">sync_alt</span>
                        {route.interchanges} change{route.interchanges !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">directions_walk</span>
                        {route.walkMins > 0 ? `${route.walkMins} min walk` : "Direct transfer"}
                      </span>
                      <span className="flex items-center gap-1 font-semibold" style={{ color: route.crowdColor }}>
                        <span className="material-symbols-outlined text-xs">people</span>
                        {route.crowd}
                      </span>
                    </div>
                  </button>

                  {/* Expandable itinerary */}
                  <AnimatePresence>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <RouteItinerary route={route} origin={origin} destination={destination} />
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
