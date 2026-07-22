"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Layers,
  Compass,
  Terminal,
  MapPin,
  Eye,
  EyeOff,
  Settings,
  User,
  ArrowLeft,
  Navigation,
  Train,
  CircleDot,
  GitCompare,
  Footprints,
  Hexagon,
  ChevronRight,
} from "lucide-react";
import {
  JourneyPlannerForm,
  JourneySummaryCard,
  StationSuggestion,
  JourneyResult,
} from "./JourneyPlanner";
import JourneyTimeline from "./JourneyTimeline";
import { formatLineName } from "./DigitalTwinInspector";

export type CityConfig = {
  name: string;
  code: string;
  center: [number, number];
  zoom: number;
};

const CITIES: CityConfig[] = [
  { name: "Delhi Metro", code: "delhi", center: [77.209, 28.6139], zoom: 11.5 },
  { name: "Kochi Metro", code: "kochi", center: [76.3244, 9.9816], zoom: 12.5 },
  { name: "Mumbai Metro", code: "mumbai", center: [72.8777, 19.076], zoom: 11.5 },
];

const MAP_LAYERS = [
  { id: "lines", name: "Metro Lines", icon: Train },
  { id: "stations", name: "Stations", icon: CircleDot },
  { id: "interchanges", name: "Interchanges", icon: GitCompare },
  { id: "walks", name: "Walk Connections", icon: Footprints },
  { id: "zones", name: "Zones", icon: Hexagon },
];

type LayerOption = {
  id: string;
  name: string;
  visible: boolean;
};

type SidebarProps = {
  activeCity: CityConfig;
  onCityChange: (city: CityConfig) => void;
  onStationSelect: (stationId: string) => void;
  activeLayers: string[];
  onToggleLayer: (layerId: string) => void;
  onDeveloperConsoleOpen: () => void;
  onFlyToCoordinates: (coords: [number, number], zoom?: number) => void;
  apiLatencySetter: (ms: number) => void;
  onJourneyResult: (result: JourneyResult | null) => void;
  onModeChange: (mode: "passenger" | "developer") => void;
};

type SearchFeature = {
  id: string;
  properties: {
    id: string;
    name: string;
    code: string;
    type: string;
    city?: string;
    lines?: { code: string; color: string; name: string }[];
  };
  geometry: {
    coordinates: number[];
  };
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function Sidebar({
  activeCity,
  onCityChange,
  onStationSelect,
  activeLayers,
  onToggleLayer,
  onDeveloperConsoleOpen,
  onFlyToCoordinates,
  apiLatencySetter,
  onJourneyResult,
  onModeChange,
}: SidebarProps) {
  // App Mode & State
  const [appMode, setAppMode] = useState<"passenger" | "developer">("passenger");
  const [sidebarState, setSidebarState] = useState<"explore" | "plan" | "summary" | "directions">("explore");

  // Journey Planner state
  const [origin, setOrigin] = useState<StationSuggestion | null>(null);
  const [destination, setDestination] = useState<StationSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journeyResultState, setJourneyResultState] = useState<JourneyResult | null>(null);

  // Original Developer states
  const [layers, setLayers] = useState<LayerOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchFeature[]>([]);
  const [searching, setSearching] = useState(false);

  // Load layers (Developer Mode only)
  const fetchLayers = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/map/layers`);
      const data = await res.json();
      if (data?.layers) {
        setLayers(
          data.layers.map((l: any) => ({
            id: l.id,
            name: l.name,
            visible: activeLayers.includes(l.id),
          }))
        );
      }
    } catch {
      // fallback
      setLayers([
        { id: "lines", name: "Metro Lines", visible: activeLayers.includes("lines") },
        { id: "stations", name: "Passenger Stations", visible: activeLayers.includes("stations") },
      ]);
    }
  }, [activeLayers]);

  useEffect(() => {
    if (appMode === "developer") {
      fetchLayers();
    }
  }, [appMode, fetchLayers]);

  // Unified Search Handler (Developer / Explore mode)
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const start = performance.now();
    try {
      const res = await fetch(`${BACKEND_URL}/map/search?q=${encodeURIComponent(q)}`);
      apiLatencySetter(Math.round(performance.now() - start));
      const data = await res.json();
      if (data?.features) {
        setSearchResults(data.features);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Toggle Mode Handler
  const handleModeChange = (mode: "passenger" | "developer") => {
    setAppMode(mode);
    onModeChange(mode);
    if (mode === "passenger") {
      setSidebarState("explore");
      // Clear journey if switching back to passenger to keep it clean
      handleResetJourney();
    }
  };

  const handleJourneyResultLoaded = (result: JourneyResult | null) => {
    setJourneyResultState(result);
    onJourneyResult(result);
    if (result) {
      setSidebarState("summary");
      // Fly to fit bounds
      if (result.journey.stations.length > 1) {
        const lats = result.journey.stations.map((s) => s.lat);
        const lngs = result.journey.stations.map((s) => s.lng);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        onFlyToCoordinates([centerLng, centerLat], 11);
      }
    }
  };

  const handleResetJourney = () => {
    setOrigin(null);
    setDestination(null);
    setJourneyResultState(null);
    onJourneyResult(null);
    setError(null);
    setSidebarState("explore");
  };

  return (
    <div className="w-96 bg-zinc-950/90 border-r border-zinc-800/80 backdrop-blur-md flex flex-col h-full text-[#f4f4f5] font-sans shadow-2xl z-10 select-none">
      
      {/* ── HEADER ── */}
      <div className="px-6 py-5 border-b border-zinc-850 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black uppercase tracking-wider text-sky-400">MetroRadar</h1>
          <p className="text-[9px] text-zinc-500 font-bold tracking-widest mt-0.5 uppercase">
            Urban Mobility Platform
          </p>
        </div>

        {/* Mode Selector Badge */}
        <button
          onClick={() => handleModeChange(appMode === "passenger" ? "developer" : "passenger")}
          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition ${
            appMode === "developer"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
              : "bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20"
          }`}
          title="Toggle between Passenger and Developer interface"
        >
          {appMode === "developer" ? (
            <>
              <Settings className="h-3 w-3 animate-spin-slow" />
              <span>Operator</span>
            </>
          ) : (
            <>
              <User className="h-3 w-3" />
              <span>Passenger</span>
            </>
          )}
        </button>
      </div>

      {/* ── PASSENGER MODE CONTENT ── */}
      {appMode === "passenger" && (
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Explore State */}
          {sidebarState === "explore" && (
            <div className="flex-1 flex flex-col px-6 py-5 space-y-6 overflow-y-auto">
              {/* Network Switcher */}
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
                  <Compass className="h-3.5 w-3.5 mr-1.5 text-zinc-500" /> Select Network
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {CITIES.map((city) => (
                    <button
                      key={city.code}
                      onClick={() => {
                        onCityChange(city);
                        onFlyToCoordinates(city.center, city.zoom);
                      }}
                      className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all duration-300 border ${
                        activeCity.code === city.code
                          ? "bg-sky-500/10 border-sky-400 text-sky-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      {city.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passenger Quick Action or Station search */}
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center">
                  <Search className="h-3.5 w-3.5 mr-1.5 text-zinc-500" /> Search Station
                </h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search metro stations..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-[#f4f4f5] focus:outline-none focus:border-sky-450 focus:bg-zinc-900 transition-all placeholder-zinc-600"
                  />
                  <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-650" />
                </div>

                {/* Quick Search results */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {searching ? (
                    <p className="text-[10px] text-zinc-500 text-center py-2">Searching index...</p>
                  ) : searchQuery.trim() !== "" && searchResults.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 text-center py-2">No stations found.</p>
                  ) : (
                    searchResults
                      .filter((f) => f.properties?.type === "station")
                      .slice(0, 3)
                      .map((f) => {
                        const props = f.properties;
                        return (
                          <button
                            key={props.id}
                            onClick={() => {
                              onStationSelect(props.id);
                              onFlyToCoordinates(f.geometry.coordinates as [number, number], 14.5);
                            }}
                            className="w-full text-left p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-sky-500/40 transition-all duration-200 group flex items-center justify-between"
                          >
                            <div className="flex items-start space-x-3 min-w-0 flex-1">
                              <div className="p-2 rounded-xl bg-zinc-850 border border-zinc-800 text-sky-400 shrink-0">
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-zinc-100 group-hover:text-sky-400 transition truncate">
                                  {props.name}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {props.city || "Delhi"}, India
                                </p>
                                {props.lines && props.lines.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {props.lines.map((l) => (
                                      <span
                                        key={l.code}
                                        className="inline-block px-2 py-0.5 rounded-full text-[8px] font-black text-white shadow-sm"
                                        style={{ backgroundColor: l.color || "#3b82f6" }}
                                      >
                                        {formatLineName(l.name)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 shrink-0 ml-2 transition" />
                          </button>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Big CTA to plan journey */}
              <div className="pt-4 border-t border-zinc-850/60">
                <button
                  onClick={() => setSidebarState("plan")}
                  className="w-full py-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 transition-all duration-300 transform active:scale-[0.98]"
                >
                  <Navigation size={14} className="rotate-45" />
                  Plan A Journey
                </button>
              </div>

              {/* Map Layers */}
              <div className="pt-5 border-t border-zinc-850/60">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
                  <Layers className="h-3.5 w-3.5 mr-1.5 text-zinc-500" /> Map Layers
                </h2>
                <div className="space-y-1">
                  {MAP_LAYERS.map((layer) => {
                    const isVisible = activeLayers.includes(layer.id);
                    const Icon = layer.icon;
                    return (
                      <button
                        key={layer.id}
                        onClick={() => onToggleLayer(layer.id)}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-zinc-900/50 text-xs font-semibold transition-all duration-200 text-left"
                      >
                        <div className="flex items-center gap-3 text-zinc-300">
                          <Icon size={14} className={isVisible ? "text-sky-400" : "text-zinc-500"} />
                          <span>{layer.name}</span>
                        </div>
                        {isVisible ? (
                          <Eye className="h-4 w-4 text-sky-400" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-zinc-700" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Plan State */}
          {sidebarState === "plan" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-4 flex items-center gap-3 border-b border-zinc-850/60">
                <button
                  onClick={() => setSidebarState("explore")}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                >
                  <ArrowLeft size={14} />
                </button>
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100">
                  Plan Journey
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <JourneyPlannerForm
                  origin={origin}
                  setOrigin={setOrigin}
                  destination={destination}
                  setDestination={setDestination}
                  loading={loading}
                  setLoading={setLoading}
                  error={error}
                  setError={setError}
                  onPlanResult={handleJourneyResultLoaded}
                  onBack={() => setSidebarState("explore")}
                />
              </div>
            </div>
          )}

          {/* Summary State */}
          {sidebarState === "summary" && journeyResultState && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-4 flex items-center gap-3 border-b border-zinc-850/60">
                <button
                  onClick={() => setSidebarState("plan")}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                >
                  <ArrowLeft size={14} />
                </button>
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100">
                  Route Summary
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <JourneySummaryCard
                  result={journeyResultState}
                  onShowDetails={() => setSidebarState("directions")}
                  onReset={handleResetJourney}
                />
              </div>
            </div>
          )}

          {/* Directions State */}
          {sidebarState === "directions" && journeyResultState && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-4 flex items-center gap-3 border-b border-zinc-850/60 shrink-0">
                <button
                  onClick={() => setSidebarState("summary")}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                >
                  <ArrowLeft size={14} />
                </button>
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100">
                  Detailed Directions
                </h2>
              </div>
              <JourneyTimeline
                result={journeyResultState}
                onClose={() => setSidebarState("summary")}
              />
            </div>
          )}

        </div>
      )}

      {/* ── DEVELOPER MODE CONTENT ── */}
      {appMode === "developer" && (
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* City Switcher */}
          <div className="px-6 py-5 border-b border-zinc-85">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
              <Compass className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Select Network
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {CITIES.map((city) => (
                <button
                  key={city.code}
                  onClick={() => {
                    onCityChange(city);
                    onFlyToCoordinates(city.center, city.zoom);
                  }}
                  className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition-all duration-300 border ${
                    activeCity.code === city.code
                      ? "bg-sky-500/10 border-sky-400 text-sky-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {city.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Unified Search Engine */}
          <div className="px-6 py-5 border-b border-zinc-850 flex-1 flex flex-col min-h-0">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
              <Search className="h-3.5 w-3.5 mr-1 text-zinc-500" /> Digital Twin Search
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search stations, lines, cities..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-[#f4f4f5] focus:outline-none focus:border-sky-450 focus:bg-zinc-900 transition-all placeholder-zinc-600"
              />
              <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-zinc-650" />
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto mt-4 space-y-2.5 scrollbar-thin">
              {searching ? (
                <p className="text-xs text-zinc-500 text-center py-4">Searching index...</p>
              ) : searchQuery.trim() !== "" && searchResults.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No results found.</p>
              ) : (
                searchResults.map((f) => {
                  const props = f.properties;
                  return (
                    <button
                      key={props.id || props.code}
                      onClick={() => {
                        if (props.type === "station") {
                          onStationSelect(props.id);
                          onFlyToCoordinates(f.geometry.coordinates as [number, number], 14.5);
                        } else if (props.type === "system") {
                          onFlyToCoordinates(f.geometry.coordinates as [number, number], 12);
                        }
                      }}
                      className="w-full text-left p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 transition-all duration-200 group flex items-start space-x-2.5"
                    >
                      <MapPin className="h-4 w-4 text-zinc-500 group-hover:text-sky-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-zinc-200 group-hover:text-zinc-100 truncate">
                            {props.name}
                          </span>
                          <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider">
                            {props.type}
                          </span>
                        </div>
                        {props.type === "station" && props.lines && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {props.lines.map((l) => (
                              <span
                                key={l.code}
                                className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase shadow-sm"
                                style={{ backgroundColor: l.color }}
                              >
                                {l.code}
                              </span>
                            ))}
                          </div>
                        )}
                        {props.city && (
                          <p className="text-[10px] text-zinc-500 mt-0.5">{props.city}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Dev Console Button (Cleaned up in passenger mode) */}
          <div className="px-6 py-4 border-t border-zinc-850 flex justify-end">
            <button
              onClick={onDeveloperConsoleOpen}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs font-semibold hover:border-zinc-700"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Console</span>
            </button>
          </div>

          {/* Layer System Manager */}
          <div className="px-6 py-5 border-t border-zinc-850 bg-zinc-950/20">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
              <Layers className="h-3.5 w-3.5 mr-1 text-zinc-500" /> GIS Layer Controls
            </h2>
            <div className="space-y-1">
              {MAP_LAYERS.map((layer) => {
                const isVisible = activeLayers.includes(layer.id);
                const Icon = layer.icon;
                return (
                  <button
                    key={layer.id}
                    onClick={() => onToggleLayer(layer.id)}
                    className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-zinc-900/50 text-xs font-semibold transition-all duration-200 text-left"
                  >
                    <div className="flex items-center gap-3 text-zinc-300">
                      <Icon size={14} className={isVisible ? "text-sky-400" : "text-zinc-500"} />
                      <span>{layer.name}</span>
                    </div>
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-sky-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-zinc-700" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
