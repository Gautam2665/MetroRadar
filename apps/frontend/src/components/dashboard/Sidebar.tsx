"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Layers, Compass, Terminal, MapPin, Eye, EyeOff } from "lucide-react";

export type CityConfig = {
  name: string;
  code: string;
  center: [number, number];
  zoom: number;
};

const CITIES: CityConfig[] = [
  { name: "Delhi Metro", code: "delhi", center: [77.209, 28.6139], zoom: 11.5 },
  { name: "Kochi Metro", code: "kochi", center: [76.2711, 9.9816], zoom: 12 },
  { name: "Mumbai Metro", code: "mumbai", center: [72.8777, 19.076], zoom: 11 },
];

type LayerOption = {
  id: string;
  name: string;
  defaultVisible: boolean;
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
};

type SearchFeature = {
  id?: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    id: string;
    code: string;
    name: string;
    type: string;
    lines?: { code: string; name: string; color: string }[];
    city?: string;
  };
};

export default function Sidebar({
  activeCity,
  onCityChange,
  onStationSelect,
  activeLayers,
  onToggleLayer,
  onDeveloperConsoleOpen,
  onFlyToCoordinates,
  apiLatencySetter,
}: SidebarProps) {
  const [layers, setLayers] = useState<LayerOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchFeature[]>([]);
  const [searching, setSearching] = useState(false);

  // Fetch layer registry from backend
  const fetchLayers = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const start = performance.now();
      const res = await fetch(`${backendUrl}/map/layers?t=${Date.now()}`);
      const ms = Math.round(performance.now() - start);
      apiLatencySetter(ms);

      const data = (await res.json()) as { layers?: LayerOption[] };
      if (data && Array.isArray(data.layers)) {
        setLayers(data.layers);
      } else {
        setLayers([
          { id: "lines", name: "Metro Lines", defaultVisible: true },
          { id: "stations", name: "Passenger Stations", defaultVisible: true },
        ]);
      }
    } catch (err) {
      console.error("Failed to load map layers registry:", err);
      // Fallback layers
      setLayers([
        { id: "lines", name: "Metro Lines", defaultVisible: true },
        { id: "stations", name: "Passenger Stations", defaultVisible: true },
      ]);
    }
  }, [apiLatencySetter]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const start = performance.now();
      const res = await fetch(`${backendUrl}/map/search?q=${encodeURIComponent(q)}&t=${Date.now()}`);
      const ms = Math.round(performance.now() - start);
      apiLatencySetter(ms);

      const data = (await res.json()) as { features?: SearchFeature[] };
      if (data && Array.isArray(data.features)) {
        setSearchResults(data.features);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [apiLatencySetter]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) {
        await fetchLayers();
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [fetchLayers]);

  return (
    <div className="w-96 bg-zinc-950/90 border-r border-zinc-800/80 backdrop-blur-md flex flex-col h-full text-[#f4f4f5] font-sans shadow-2xl z-10">
      
      {/* Header Info */}
      <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black uppercase tracking-wider text-sky-400">MetroRadar</h1>
          <p className="text-[10px] text-zinc-500 font-semibold tracking-widest mt-0.5 uppercase">
            Urban Mobility Platform
          </p>
        </div>
        <button
          onClick={onDeveloperConsoleOpen}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs font-semibold hover:border-zinc-700"
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>Console</span>
        </button>
      </div>

      {/* City Switcher */}
      <div className="px-6 py-5 border-b border-zinc-850">
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
                  ? "bg-sky-650/15 border-sky-400 text-sky-400"
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
                  key={f.id || props.id || props.code}
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

      {/* Layer System Manager */}
      <div className="px-6 py-5 border-t border-zinc-850 bg-zinc-950/20">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
          <Layers className="h-3.5 w-3.5 mr-1 text-zinc-500" /> GIS Layer Controls
        </h2>
        <div className="space-y-2">
          {layers.map((layer) => {
            const isVisible = activeLayers.includes(layer.id);
            return (
              <button
                key={layer.id}
                onClick={() => onToggleLayer(layer.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all duration-300 ${
                  isVisible
                    ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                    : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-400"
                }`}
              >
                <span>{layer.name}</span>
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
  );
}
