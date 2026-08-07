"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import MapContainer from "../../components/map/MapContainer";
import { JourneyPlannerContainer, RouteOption } from "../../containers/JourneyPlannerContainer";
import { CITY_METADATA } from "../../config/cityMetadata";

// Journey step / itinerary breakdown displayed after a route is found
type JourneyStep = {
  type: "board" | "alight" | "transfer" | "walk" | "arrive";
  stationName: string;
  detail: string;
  icon: string;
  color: string;
  time?: string;
};

function buildSteps(route: RouteOption, origin: string, dest: string): JourneyStep[] {
  const steps: JourneyStep[] = [];
  let legIdx = 0;
  for (const leg of route.legs) {
    if (legIdx === 0) {
      steps.push({
        type: "board",
        stationName: origin || "Origin",
        detail: leg.mode === "cab" ? "Board Cab / Auto" : `Board ${leg.line}`,
        icon: leg.mode === "cab" ? "local_taxi" : "directions_subway",
        color: leg.color,
      });
    }
    if (legIdx > 0) {
      steps.push({
        type: "transfer",
        stationName: "Transfer",
        detail: `Change to ${leg.line}`,
        icon: "sync_alt",
        color: leg.color,
      });
    }
    legIdx++;
  }
  steps.push({
    type: "arrive",
    stationName: dest || "Destination",
    detail: `Arrive · ${route.duration}`,
    icon: "location_on",
    color: "#4ade80",
  });
  return steps;
}

export default function JourneyPlannerPage() {
  const [activeCity, setActiveCity] = useState("delhi");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [routeGeojson, setRouteGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [originName, setOriginName] = useState("");
  const [destName, setDestName] = useState("");
  const [activeTab, setActiveTab] = useState<"planner" | "itinerary">("planner");

  const meta = CITY_METADATA[activeCity] || CITY_METADATA.delhi;

  const handleGeojsonUpdate = useCallback((geojson: GeoJSON.FeatureCollection | Record<string, unknown>) => {
    setRouteGeojson(geojson as GeoJSON.FeatureCollection);
    setActiveTab("itinerary");
  }, []);

  const handleRouteFound = useCallback((route: RouteOption, from: string, to: string) => {
    setActiveRoute(route);
    setOriginName(from);
    setDestName(to);
    setActiveTab("itinerary");
  }, []);

  const steps = activeRoute ? buildSteps(activeRoute, originName, destName) : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#080C14] text-[#dfe2ee]">
      <Sidebar />

      <div className="flex-1 flex flex-col md:ml-[260px] h-full overflow-hidden">
        <Header
          activeCity={activeCity}
          onCityChange={(city) => {
            setActiveCity(city);
            setActiveRoute(null);
            setRouteGeojson(null);
            setActiveTab("planner");
          }}
        />

        {/* Main content — full height split */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* ── LEFT PANEL ─────────────────────────────────────────── */}
          <div className="w-full lg:w-[440px] flex-shrink-0 flex flex-col h-full bg-[#0b0f17] border-r border-white/8 overflow-hidden">

            {/* Panel Header */}
            <div className="px-6 pt-5 pb-4 border-b border-white/8 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-lg font-bold text-[#dfe2ee] leading-tight">Plan a Journey</h1>
                  <p className="text-xs text-[#bac9cc] mt-0.5">
                    Dijkstra CTM Pathfinder · {meta.name}
                  </p>
                </div>
                {/* Live status badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00e5ff]/8 border border-[#00e5ff]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-wider">Live</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                {(["planner", "itinerary"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                      activeTab === tab
                        ? "bg-[#1c2028] text-[#dfe2ee] shadow"
                        : "text-[#bac9cc] hover:text-[#dfe2ee]"
                    }`}
                  >
                    {tab === "itinerary" ? (
                      <span className="flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-xs">route</span>
                        Itinerary
                        {activeRoute && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] ml-1" />
                        )}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-xs">search</span>
                        Planner
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {activeTab === "planner" ? (
                <JourneyPlannerContainer
                  activeCity={activeCity}
                  onGeojsonUpdate={handleGeojsonUpdate}
                  onRouteFound={handleRouteFound}
                />
              ) : (
                /* ── ITINERARY TAB ── */
                <div className="p-5 space-y-4">
                  {activeRoute ? (
                    <>
                      {/* Route summary card */}
                      <div className="rounded-2xl bg-gradient-to-br from-[#00e5ff]/10 to-[#00e5ff]/4 border border-[#00e5ff]/20 p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-wider mb-1">Best Route</p>
                            <p className="text-3xl font-black text-[#dfe2ee] leading-none">{activeRoute.duration}</p>
                            <p className="text-xs text-[#bac9cc] mt-1">{activeRoute.distance}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-[#00e5ff]">{activeRoute.fare}</div>
                            {activeRoute.smartCardFare && (
                              <div className="text-xs text-[#4ade80] font-bold mt-0.5">
                                Card: {activeRoute.smartCardFare}
                              </div>
                            )}
                            <div className="text-[10px] text-[#bac9cc] mt-1">
                              Score {activeRoute.score}/100
                            </div>
                          </div>
                        </div>

                        {/* Leg pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {activeRoute.legs.map((leg, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <span
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md"
                                style={{
                                  backgroundColor: `${leg.color}25`,
                                  color: leg.color,
                                  border: `1px solid ${leg.color}40`,
                                }}
                              >
                                <span className="material-symbols-outlined text-[10px]">
                                  {leg.mode === "walk" ? "directions_walk" : leg.mode === "cab" ? "local_taxi" : "subway"}
                                </span>
                                {leg.line}
                                {leg.durationMins && <span className="opacity-70">{leg.durationMins}m</span>}
                              </span>
                              {i < activeRoute.legs.length - 1 && (
                                <span className="text-[#bac9cc] text-[10px]">→</span>
                              )}
                            </span>
                          ))}
                        </div>

                        {/* Quick stats row */}
                        <div className="flex gap-4 mt-4 pt-4 border-t border-white/8">
                          <div className="flex items-center gap-1.5 text-xs text-[#bac9cc]">
                            <span className="material-symbols-outlined text-sm text-[#bac9cc]">sync_alt</span>
                            {activeRoute.interchanges} Transfer{activeRoute.interchanges !== 1 ? "s" : ""}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#bac9cc]">
                            <span className="material-symbols-outlined text-sm text-[#bac9cc]">directions_walk</span>
                            {activeRoute.walkDistance}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="material-symbols-outlined text-sm" style={{ color: activeRoute.crowdColor }}>people</span>
                            <span style={{ color: activeRoute.crowdColor }}>{activeRoute.crowd} Crowd</span>
                          </div>
                        </div>
                      </div>

                      {/* Board in coach hint */}
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fec931]/8 border border-[#fec931]/20">
                        <span className="material-symbols-outlined text-[#fec931]">train</span>
                        <div>
                          <p className="text-xs font-bold text-[#fec931]">Board from {activeRoute.boardCoach}</p>
                          <p className="text-[11px] text-[#bac9cc]">Nearest to exit at destination</p>
                        </div>
                      </div>

                      {/* Step-by-step itinerary */}
                      <div>
                        <h3 className="text-xs font-bold text-[#bac9cc] uppercase tracking-wider mb-3">
                          Step-by-Step
                        </h3>
                        <div className="relative">
                          {/* Vertical connector line */}
                          <div className="absolute left-4 top-4 bottom-4 w-px bg-white/10" />

                          <div className="space-y-0">
                            {steps.map((step, i) => (
                              <div key={i} className="flex items-start gap-4 relative py-3">
                                {/* Icon circle */}
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                                  style={{ backgroundColor: `${step.color}20`, border: `1.5px solid ${step.color}50` }}
                                >
                                  <span
                                    className="material-symbols-outlined text-sm"
                                    style={{ color: step.color, fontVariationSettings: "'FILL' 1" }}
                                  >
                                    {step.icon}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                  <p className="text-sm font-bold text-[#dfe2ee] leading-tight truncate">
                                    {step.stationName}
                                  </p>
                                  <p className="text-xs text-[#bac9cc] mt-0.5">{step.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setActiveTab("planner")}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-[#dfe2ee] border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          ← Edit Journey
                        </button>
                        <button className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#00e5ff] text-[#001f24] hover:bg-[#00daf3] transition-colors">
                          Save Route
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Empty itinerary state */
                    <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-[#bac9cc]/40">route</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#dfe2ee]">No route yet</p>
                        <p className="text-xs text-[#bac9cc] mt-1">
                          Search a journey in the Planner tab to see your itinerary here.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("planner")}
                        className="px-4 py-2 rounded-full text-xs font-bold bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 hover:bg-[#00e5ff]/20 transition-colors"
                      >
                        Open Planner →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── QUICK PILLS — always visible at bottom ── */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-white/8 bg-[#0b0f17]">
              <p className="text-[10px] font-bold text-[#bac9cc] uppercase tracking-wider mb-2">
                Popular in {meta.name}
              </p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {meta.quickPills.map((pill) => (
                  <button
                    key={pill}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#bac9cc] hover:bg-white/10 hover:text-[#dfe2ee] hover:border-[#00e5ff]/30 transition-all whitespace-nowrap"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL — Map ──────────────────────────────────── */}
          <div className="flex-1 relative bg-[#0a0e14] overflow-hidden">
            {/* Map overlay — line badges */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
              <div className="flex items-center gap-2 bg-[#0b0f17]/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
                <span className="text-[11px] font-bold text-[#00e5ff] uppercase tracking-wider">Live Map</span>
                <span className="text-[10px] text-[#bac9cc]">· {meta.name}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                {meta.quickPills.slice(0, 3).map((pill) => (
                  <span
                    key={pill}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Route found overlay */}
            {activeRoute && (
              <div className="absolute top-4 right-4 z-20 bg-[#0b0f17]/90 backdrop-blur-md rounded-xl border border-[#00e5ff]/30 px-4 py-3 shadow-lg">
                <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-wider mb-1">Route Active</p>
                <p className="text-sm font-bold text-[#dfe2ee]">{activeRoute.duration}</p>
                <p className="text-xs text-[#bac9cc]">{activeRoute.fare} · {activeRoute.distance}</p>
              </div>
            )}

            {/* Map instruction overlay — shown when no route */}
            {!activeRoute && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#0b0f17]/80 backdrop-blur-sm rounded-xl border border-white/10 px-4 py-3 text-center pointer-events-none">
                <p className="text-xs text-[#bac9cc]">
                  <span className="text-[#00e5ff] font-bold">Click any station</span> on the map or search above to plan your journey
                </p>
              </div>
            )}

            {/* The Map */}
            <MapContainer
              activeCity={activeCity}
              activeLayers={["lines", "stations", "realtime"]}
              selectedStationId={selectedStationId}
              journeyGeojson={routeGeojson}
              onStationSelect={(id) => setSelectedStationId(id)}
              onSelectStation={(station) => {
                setSelectedStationId(station.id);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
