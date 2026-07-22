"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  RefreshCcw,
  X,
  Search,
  Zap,
  ArrowRight,
  Clock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type StationRef = {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
};

export type JourneyLeg = {
  from: string;
  fromStationName: string;
  to: string;
  toStationName: string;
  type: "TRANSIT" | "TRANSFER" | "WALK";
  duration: number;
  lineId: string | null;
  lineName: string | null;
  lineColor: string | null;
  lineCode: string | null;
  stationsCount: number;
};

export type JourneyResult = {
  metadata: {
    from: StationRef;
    to: StationRef;
    algorithm: string;
    graphVersion: string;
  };
  journey: {
    score: number;
    duration: number; // minutes
    durationSeconds: number;
    transfers: number;
    legs: JourneyLeg[];
    stations: StationRef[];
    geojson: GeoJSON.FeatureCollection;
  };
};

export type StationSuggestion = {
  id: string;
  name: string;
  code: string;
  city?: string;
  lines?: { code: string; color: string; name: string }[];
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// ── Score Badge Helper ───────────────────────────────────────────────────────

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "#22c55e"
      : score >= 60
        ? "#eab308"
        : "#f97316";
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      <Zap size={8} />
      {score}/100
    </div>
  );
}

// ── Station Search Input Component ───────────────────────────────────────────

export function StationInput({
  label,
  icon: Icon,
  value,
  onSelect,
  placeholder,
}: {
  label: string;
  icon: React.ElementType;
  value: StationSuggestion | null;
  onSelect: (station: StationSuggestion | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<StationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    } else {
      setQuery("");
    }
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
    if (q.trim() === "") {
      onSelect(null);
    }
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
      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 focus-within:border-sky-500/60 transition-colors">
        <Icon size={14} className="text-zinc-400 shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none"
        />
        {searching && (
          <div className="h-3.5 w-3.5 border border-sky-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => handleSelect(s)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-900 transition-colors text-left"
            >
              <Search size={12} className="text-zinc-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-100 truncate font-semibold">{s.name}</p>
                {s.city && (
                  <p className="text-[10px] text-zinc-500">{s.city}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {(s.lines ?? []).slice(0, 3).map((l) => (
                  <span
                    key={l.code}
                    className="text-[8px] px-1 py-0.5 rounded font-bold"
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

// ── Journey Planner Form Component ───────────────────────────────────────────

type JourneyPlannerFormProps = {
  origin: StationSuggestion | null;
  setOrigin: (s: StationSuggestion | null) => void;
  destination: StationSuggestion | null;
  setDestination: (s: StationSuggestion | null) => void;
  loading: boolean;
  setLoading: (b: boolean) => void;
  error: string | null;
  setError: (s: string | null) => void;
  onPlanResult: (result: JourneyResult | null) => void;
  onBack: () => void;
};

export function JourneyPlannerForm({
  origin,
  setOrigin,
  destination,
  setDestination,
  loading,
  setLoading,
  error,
  setError,
  onPlanResult,
  onBack,
}: JourneyPlannerFormProps) {
  const canSearch = origin !== null && destination !== null && !loading;

  const handleSearch = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    onPlanResult(null);

    try {
      const res = await fetch(
        `${BACKEND_URL}/journeys?from=${origin.id}&to=${destination.id}`
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.message ?? `Error ${res.status}`);
      }
      const data: JourneyResult = await res.json();
      onPlanResult(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to plan journey");
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <div className="space-y-4 px-6 py-2" id="journey-planner-form">
      {/* Station Inputs */}
      <div className="space-y-2 relative">
        <StationInput
          label="From"
          icon={MapPin}
          value={origin}
          onSelect={setOrigin}
          placeholder="Origin station..."
        />

        {/* Swap button */}
        <div className="flex justify-center my-0.5">
          <button
            onClick={handleSwap}
            className="h-7 w-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 hover:border-zinc-700 transition-colors"
            title="Swap origin and destination"
            id="journey-swap-btn"
          >
            <RefreshCcw size={12} className="text-zinc-400" />
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

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handleSearch}
          disabled={!canSearch}
          id="journey-search-btn"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200
            bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Planning journey...
            </>
          ) : (
            <>
              <Navigation size={12} />
              Plan Journey
            </>
          )}
        </button>

        <button
          onClick={onBack}
          className="w-full py-2.5 rounded-xl border border-zinc-850 hover:border-zinc-800 text-zinc-500 hover:text-zinc-400 transition text-xs font-semibold"
        >
          Cancel
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          <X size={12} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ── Journey Summary Card Component ───────────────────────────────────────────

type JourneySummaryCardProps = {
  result: JourneyResult;
  onShowDetails: () => void;
  onReset: () => void;
};

export function JourneySummaryCard({
  result,
  onShowDetails,
  onReset,
}: JourneySummaryCardProps) {
  const { journey } = result;

  // Filter transit leg lines to render transit badges
  const transitLegs = journey.legs.filter((leg) => leg.type === "TRANSIT");

  return (
    <div className="space-y-4 px-6 py-2" id="journey-summary-card">
      <div className="rounded-2xl border border-zinc-850 bg-zinc-950/40 p-4 space-y-4">
        {/* Metric block */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Total Travel Time
            </span>
            <div className="flex items-baseline gap-1 text-zinc-100">
              <Clock size={14} className="text-zinc-400 mr-1 self-center" />
              <span className="text-2xl font-black">{journey.duration}</span>
              <span className="text-xs font-semibold text-zinc-400">min</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <ScoreBadge score={journey.score} />
            <p className="text-[10px] text-zinc-500 font-mono">
              {journey.transfers} transfer{journey.transfers !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Route Line badges flow */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
            Lines Traversed
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {journey.legs.map((leg, i) => {
              const isLast = i === journey.legs.length - 1;
              const isTransit = leg.type === "TRANSIT";

              return (
                <div key={i} className="flex items-center gap-1.5">
                  {isTransit ? (
                    <span
                      className="text-[9px] px-2 py-0.5 rounded font-black border uppercase"
                      style={{
                        backgroundColor: `${leg.lineColor}22`,
                        color: leg.lineColor ?? "#94a3b8",
                        borderColor: `${leg.lineColor}44`,
                      }}
                    >
                      {leg.lineCode ?? leg.lineName?.split(" ")[0]}
                    </span>
                  ) : leg.type === "WALK" ? (
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Walk
                    </span>
                  ) : null}

                  {!isLast && (leg.type === "TRANSIT" || leg.type === "WALK") && (
                    <ArrowRight size={10} className="text-zinc-700" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button
          onClick={onShowDetails}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200
            bg-sky-500 hover:bg-sky-400 text-white"
        >
          Show Journey Details
        </button>

        <button
          onClick={onReset}
          className="w-full py-2.5 rounded-xl border border-zinc-850 hover:border-zinc-800 text-zinc-500 hover:text-zinc-400 transition text-xs font-semibold"
        >
          Plan New Journey
        </button>
      </div>
    </div>
  );
}
