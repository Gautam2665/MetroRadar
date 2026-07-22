"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  ArrowRight,
  Clock,
  RefreshCcw,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Zap,
  Train,
  Footprints,
} from "lucide-react";

// ── Types matching the backend JourneyResponse ──────────────────────────────

type StationRef = {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
};

type JourneyLeg = {
  from: string;
  to: string;
  type: "TRANSIT" | "TRANSFER" | "WALK";
  duration: number; // seconds
  lineId: string | null;
  lineName: string | null;
  lineColor: string | null;
  lineCode: string | null;
};

type JourneyResult = {
  metadata: {
    generatedAt: string;
    algorithm: string;
    graphVersion: string;
    from: StationRef;
    to: StationRef;
  };
  journey: {
    score: number;
    duration: number; // minutes
    durationSeconds: number;
    transfers: number;
    walkingDistance: number;
    legs: JourneyLeg[];
    stations: StationRef[];
    geojson: GeoJSON.FeatureCollection;
  };
};

type StationSuggestion = {
  id: string;
  name: string;
  code: string;
  city?: string;
  lines?: { code: string; color: string; name: string }[];
};

type JourneyPlannerProps = {
  onJourneyResult: (result: JourneyResult | null) => void;
  onFlyToCoordinates: (coords: [number, number], zoom?: number) => void;
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// ── Sub-components ──────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "#22c55e"
      : score >= 60
        ? "#eab308"
        : "#f97316";
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      <Zap size={10} />
      {score}/100
    </div>
  );
}

function LegIcon({ type }: { type: JourneyLeg["type"] }) {
  if (type === "TRANSIT")
    return <Train size={12} className="text-sky-400 shrink-0" />;
  if (type === "WALK")
    return <Footprints size={12} className="text-emerald-400 shrink-0" />;
  return <RefreshCcw size={12} className="text-amber-400 shrink-0" />;
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── Station Search Input ────────────────────────────────────────────────────

function StationInput({
  label,
  icon: Icon,
  value,
  onSelect,
  placeholder,
}: {
  label: string;
  icon: React.ElementType;
  value: StationSuggestion | null;
  onSelect: (station: StationSuggestion) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/map/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (data?.features) {
        setSuggestions(
          data.features
            .filter((f: any) => f.properties?.type === "station")
            .slice(0, 8)
            .map((f: any) => ({
              id: f.properties.id,
              name: f.properties.name,
              code: f.properties.code,
              city: f.properties.city,
              lines: f.properties.lines ?? [],
            }))
        );
        setOpen(true);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (s: StationSuggestion) => {
    setQuery(s.name);
    setSuggestions([]);
    setOpen(false);
    onSelect(s);
  };

  return (
    <div className="relative">
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-3 py-2.5 focus-within:border-sky-500/60 transition-colors">
        <Icon size={14} className="text-zinc-400 shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
        />
        {searching && (
          <div className="h-3.5 w-3.5 border border-sky-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => handleSelect(s)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/80 transition-colors text-left"
            >
              <Search size={12} className="text-zinc-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-100 truncate">{s.name}</p>
                {s.city && (
                  <p className="text-[10px] text-zinc-500">{s.city}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {(s.lines ?? []).slice(0, 3).map((l) => (
                  <span
                    key={l.code}
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                    style={{ backgroundColor: `${l.color}33`, color: l.color }}
                  >
                    {l.code}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main JourneyPlanner Component ───────────────────────────────────────────

export default function JourneyPlanner({
  onJourneyResult,
  onFlyToCoordinates,
}: JourneyPlannerProps) {
  const [expanded, setExpanded] = useState(true);
  const [origin, setOrigin] = useState<StationSuggestion | null>(null);
  const [destination, setDestination] = useState<StationSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JourneyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSearch = origin !== null && destination !== null && !loading;

  const handleSearch = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    setResult(null);
    onJourneyResult(null);

    try {
      const res = await fetch(
        `${BACKEND_URL}/journeys?from=${origin.id}&to=${destination.id}`
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.message ?? `Error ${res.status}`);
      }
      const data: JourneyResult = await res.json();
      setResult(data);
      onJourneyResult(data);

      // Fly to fit journey bounds
      if (data.journey.stations.length > 1) {
        const lats = data.journey.stations.map((s) => s.lat);
        const lngs = data.journey.stations.map((s) => s.lng);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        onFlyToCoordinates([centerLng, centerLat], 11);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to plan journey");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setOrigin(null);
    setDestination(null);
    setResult(null);
    setError(null);
    onJourneyResult(null);
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setResult(null);
    onJourneyResult(null);
  };

  return (
    <div className="w-full flex flex-col h-full bg-zinc-950/40">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
        id="journey-planner-toggle"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-md bg-sky-500/20 flex items-center justify-center">
            <Navigation size={13} className="text-sky-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-100">
            Journey Planner
          </span>
          {result && (
            <ScoreBadge score={result.journey.score} />
          )}
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-zinc-500" />
        ) : (
          <ChevronDown size={14} className="text-zinc-500" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Station Inputs */}
          <div className="space-y-2">
            <StationInput
              label="From"
              icon={MapPin}
              value={origin}
              onSelect={setOrigin}
              placeholder="Origin station..."
            />

            {/* Swap button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwap}
                className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
                title="Swap origin and destination"
                id="journey-swap-btn"
              >
                <RefreshCcw size={11} className="text-zinc-400" />
              </button>
            </div>

            <StationInput
              label="To"
              icon={Navigation}
              value={destination}
              onSelect={setDestination}
              placeholder="Destination station..."
            />
          </div>

          {/* Action Row */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={!canSearch}
              id="journey-search-btn"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Planning...
                </>
              ) : (
                <>
                  <Navigation size={14} />
                  Plan Journey
                </>
              )}
            </button>

            {(result || error || origin || destination) && (
              <button
                onClick={handleClear}
                className="h-10 w-10 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 transition-colors"
                title="Clear journey"
                id="journey-clear-btn"
              >
                <X size={14} className="text-zinc-400" />
              </button>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              <X size={14} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Journey Result */}
          {result && (
            <JourneyResultCard result={result} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Journey Result Card ─────────────────────────────────────────────────────

function JourneyResultCard({ result }: { result: JourneyResult }) {
  const { journey, metadata } = result;

  return (
    <div
      className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 overflow-hidden"
      id="journey-result-card"
    >
      {/* Summary Header */}
      <div className="px-4 py-3 bg-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-100">
            <Clock size={13} className="text-zinc-400" />
            <span className="text-base font-bold">{journey.duration}m</span>
          </div>
          {journey.transfers > 0 && (
            <span className="text-xs text-zinc-500">
              {journey.transfers} transfer{journey.transfers > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ScoreBadge score={journey.score} />
      </div>

      {/* Route Summary */}
      <div className="px-4 py-2 flex items-center gap-2 text-xs text-zinc-400 border-b border-zinc-800/60">
        <span className="font-medium text-zinc-300">{metadata.from.name}</span>
        <ArrowRight size={10} className="text-zinc-600" />
        <span className="font-medium text-zinc-300">{metadata.to.name}</span>
      </div>

      {/* Legs */}
      <div className="px-4 py-3 space-y-2.5 max-h-64 overflow-y-auto">
        {journey.legs.map((leg, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <LegIcon type={leg.type} />

            {/* Line color dot */}
            {leg.lineColor && (
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: leg.lineColor }}
              />
            )}

            {/* Leg label */}
            <div className="flex-1 min-w-0">
              {leg.type === "TRANSIT" && leg.lineName ? (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${leg.lineColor ?? "#3b82f6"}22`,
                    color: leg.lineColor ?? "#3b82f6",
                  }}
                >
                  {leg.lineName}
                </span>
              ) : leg.type === "WALK" ? (
                <span className="text-xs text-emerald-400">Walk</span>
              ) : (
                <span className="text-xs text-amber-400">Change line</span>
              )}
            </div>

            {/* Duration */}
            <span className="text-xs text-zinc-500 shrink-0">
              {formatDuration(leg.duration)}
            </span>
          </div>
        ))}
      </div>

      {/* Station count */}
      <div className="px-4 py-2 border-t border-zinc-800/60 text-[10px] text-zinc-600">
        {journey.stations.length} stations · via {metadata.algorithm} · graph {metadata.graphVersion}
      </div>
    </div>
  );
}
