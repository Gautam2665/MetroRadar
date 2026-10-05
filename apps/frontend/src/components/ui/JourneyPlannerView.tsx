"use client";

import { motion, AnimatePresence } from "framer-motion";
import { StationSearchInput, StationItem } from "../StationSearchInput";
import { RouteOption, RouteLeg } from "../../containers/JourneyPlannerContainer";
import { formatShortLineName, formatLineName } from "../../utils/transitFormatter";
import { CITY_METADATA } from "../../config/cityMetadata";

export type { RouteOption, RouteLeg };

export interface JourneyPlannerViewProps {
  activeCity: string;
  origin: string;
  destination: string;
  originId: string | null;
  destinationId: string | null;
  activeRouteIndex: number | null;
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
  onQuickPillSelect?: (pill: string) => void;
}

// ── Leg chips matching Stitch UI design ──────────────────────────────────────

function LegChips({ legs }: { legs: RouteLeg[] }) {
  const transitLegs = legs.filter((l) => l.mode !== "walk" && l.type !== "WALK");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {transitLegs.map((leg, i) => {
        const shortName = leg.shortLine || formatShortLineName(leg.rawLineName || leg.line);
        const color = leg.color || leg.lineColor || "#06b6d4";

        return (
          <span key={i} className="inline-flex items-center gap-1">
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold shadow-sm"
              style={{
                backgroundColor: `${color}20`,
                borderColor: `${color}50`,
                borderWidth: "1px",
                color: color,
              }}
            >
              <span className="material-symbols-outlined text-[13px]">subway</span>
              <span>{shortName}</span>
              {leg.durationMins && (
                <span className="text-white/60 font-normal">· {leg.durationMins}m</span>
              )}
            </span>
            {i < transitLegs.length - 1 && (
              <span className="text-slate-500 text-xs px-0.5">→</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ── 3-Column Metadata Row matching Stitch UI ─────────────────────────────────

function StatsGrid({ route }: { route: RouteOption }) {
  const isDirect = route.interchanges === 0;
  const transferColor = isDirect ? "text-purple-400" : "text-cyan-400";

  return (
    <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 rounded-lg bg-[#080c14]/80 border border-white/[0.06] text-center text-slate-300 text-[11px]">
      <div className="flex items-center justify-center gap-1 font-mono">
        <span className={`material-symbols-outlined text-[14px] ${transferColor}`}>
          sync_alt
        </span>
        <span>
          {route.interchanges} transfer{route.interchanges !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1 font-mono">
        <span className="material-symbols-outlined text-[14px] text-cyan-400">
          directions_walk
        </span>
        <span>{route.walkDistance || "0m walking"}</span>
      </div>

      <div
        className="flex items-center justify-center gap-1 font-mono font-medium"
        style={{ color: route.crowdColor }}
      >
        <span className="material-symbols-outlined text-[14px]">groups</span>
        <span>{route.crowd} crowd</span>
      </div>
    </div>
  );
}

// ── Coach Recommendation Banner ──────────────────────────────────────────────

function CoachTip({ coach, destination }: { coach?: string; destination?: string }) {
  const coachLabel = coach || "COACH 3";
  const destText = destination ? `at ${destination}` : "at destination";

  return (
    <div className="mt-3.5 rounded-xl bg-[#1e2638]/90 border border-amber-500/40 p-2.5 flex items-start gap-2.5 shadow-sm">
      <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">
        subway
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[9.5px] text-amber-400 uppercase font-bold tracking-wider">
          BOARD {coachLabel.toUpperCase()}
        </div>
        <div className="text-[11px] text-slate-200 leading-snug mt-0.5">
          Nearest to exit {destText} · Saves ~3 min walking
        </div>
      </div>
    </div>
  );
}

// ── Stitch Vertical Timeline: Journey Details ────────────────────────────────

function JourneyDetailsTimeline({
  route,
  origin,
  destination,
}: {
  route: RouteOption;
  origin: string;
  destination: string;
}) {
  const transitLegs = route.legs.filter((l) => l.mode !== "walk" && l.type !== "WALK");
  const totalStops = transitLegs.reduce((sum, l) => sum + (l.stopsCount || 1), 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-4 pt-4 border-t border-white/[0.08]"
    >
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
          Journey Details
        </span>
        <span className={`text-[10px] font-mono font-medium ${route.interchanges === 0 ? "text-purple-400" : "text-cyan-400"}`}>
          {totalStops} STOPS {route.interchanges === 0 ? "DIRECT" : "NAVIGATION"}
        </span>
      </div>

      {/* Connected Timeline */}
      <div
        className={`relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-3 before:w-0.5 ${
          route.interchanges === 0
            ? "before:bg-[#0284c7]"
            : "before:bg-gradient-to-b before:from-emerald-400 via-amber-400 to-rose-500"
        }`}
      >
        {/* Step 1: Origin Boarding */}
        {transitLegs.length > 0 && (
          <div className="relative">
            <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#151b28] shadow-[0_0_8px_#34d399]" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">
                  BOARD · {transitLegs[0].fromStation || origin}
                </span>
                <span
                  className="px-1.5 py-0.2 rounded text-[9px] font-bold border"
                  style={{
                    backgroundColor: `${transitLegs[0].color}25`,
                    color: transitLegs[0].color,
                    borderColor: `${transitLegs[0].color}50`,
                  }}
                >
                  {transitLegs[0].shortLine || formatShortLineName(transitLegs[0].line)}
                </span>
              </div>
              <div className="text-[11.5px] text-slate-300 mt-1">
                {transitLegs[0].platform ? `${transitLegs[0].platform} · ` : ""}
                {transitLegs[0].towards
                  ? `Towards ${transitLegs[0].towards}`
                  : formatLineName(transitLegs[0].line)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {transitLegs[0].stopsCount
                  ? `Ride ${transitLegs[0].stopsCount} stop${transitLegs[0].stopsCount !== 1 ? "s" : ""}`
                  : "In-vehicle transit"}
                {transitLegs[0].durationMins ? ` (${transitLegs[0].durationMins} min)` : ""}
              </div>
            </div>
          </div>
        )}

        {/* Intermediate notice for direct route */}
        {route.interchanges === 0 && (
          <div className="p-2.5 rounded-lg bg-[#080c14]/80 border border-white/[0.06] text-xs text-slate-300">
            <div className="font-semibold text-purple-300">No transfers required</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Stay on the same train for {totalStops} stops. Approx {route.durationMins} min runtime.
            </div>
          </div>
        )}

        {/* Transfers & Connecting Legs */}
        {transitLegs.slice(0, -1).map((curLeg, idx) => {
          const nextLeg = transitLegs[idx + 1];
          const deboardStation = curLeg.toStation || "Transfer Station";
          const boardStation = nextLeg.fromStation || deboardStation;
          const nextShortLine = nextLeg.shortLine || formatShortLineName(nextLeg.line);

          // Find intervening walk leg if present
          const walkLeg = route.legs.find(
            (l) =>
              (l.mode === "walk" || l.type === "WALK" || l.type === "TRANSFER") &&
              (l.fromStation === deboardStation || l.toStation === boardStation)
          );

          // Derive transfer title and duration from authoritative backend DTO
          const transferTitle =
            walkLeg?.transferTitle ||
            (walkLeg as any)?.transferDetails?.name ||
            `Transfer to ${nextShortLine}`;

          const transferDuration =
            walkLeg?.transferDurationText ||
            (walkLeg as any)?.transferDetails?.durationDisplay ||
            (walkLeg?.durationMins ? `~${walkLeg.durationMins} min` : "~5 min");

          const transferSteps: string[] =
            walkLeg?.transferInstructions && walkLeg.transferInstructions.length > 0
              ? walkLeg.transferInstructions
              : (walkLeg as any)?.transferDetails?.instructions &&
                (walkLeg as any).transferDetails.instructions.length > 0
              ? (walkLeg as any).transferDetails.instructions
              : [`Follow signs to ${nextShortLine} connecting concourse`];

          const deboardDoors = curLeg.doorsOpen;

          return (
            <div key={idx} className="space-y-4">
              {/* 1. DEBOARD AT INTERCHANGE */}
              <div className="relative">
                <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-[#151b28] shadow-[0_0_8px_#fbbf24]" />
                <div>
                  <div className="text-xs font-bold text-slate-100">
                    DEBOARD · {deboardStation}
                  </div>
                  {deboardDoors && (
                    <div className="text-[11px] text-amber-300/90 mt-0.5">
                      Doors open on the {deboardDoors}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. TRANSFER INSET CARD */}
              <div className="p-3 rounded-xl bg-[#080c14]/90 border border-white/10 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <span className="material-symbols-outlined text-[15px] text-amber-400">directions_walk</span>
                    <span>{transferTitle}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {transferDuration}
                  </span>
                </div>
                <div className="space-y-1.5 text-[11.5px] text-slate-300">
                  {transferSteps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-1.5">
                      <span className="text-slate-500 font-bold">•</span>
                      <span className="leading-snug">{step.replace(/^\d+\.\s*/, "")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. BOARD CONNECTING LINE */}
              <div className="relative">
                <span
                  className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[#151b28] shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: nextLeg.color, color: nextLeg.color }}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">
                      BOARD · {boardStation}
                    </span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold border"
                      style={{
                        backgroundColor: `${nextLeg.color}25`,
                        color: nextLeg.color,
                        borderColor: `${nextLeg.color}50`,
                      }}
                    >
                      {nextShortLine}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-slate-300 mt-1">
                    {nextLeg.platform ? `${nextLeg.platform} · ` : ""}
                    {nextLeg.towards
                      ? `Towards ${nextLeg.towards}`
                      : formatLineName(nextLeg.line)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {nextLeg.stopsCount
                      ? `Ride ${nextLeg.stopsCount} stop${nextLeg.stopsCount !== 1 ? "s" : ""}`
                      : "In-vehicle transit"}
                    {nextLeg.durationMins ? ` (${nextLeg.durationMins} min)` : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Step Final: Destination Deboard */}
        <div className="relative">
          <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#151b28] shadow-[0_0_8px_#f43f5e]" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white">
                DEBOARD · {destination || "Destination"}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/40">
                DESTINATION
              </span>
            </div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">
              Alight platform · {
                (destination || "").toUpperCase().includes("NIZAMUDDIN") || (destination || "").toUpperCase().includes("SARAI KALE KHAN")
                  ? "Exit for Railway / RRTS"
                  : (destination || "").toUpperCase().includes("CSMT") || (destination || "").toUpperCase().includes("CENTRAL")
                  ? "Exit for Mainline Railway Terminal"
                  : "Exit station"
              }
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Coach Guidance Tip */}
      <CoachTip coach={route.boardCoach} destination={destination} />
    </motion.div>
  );
}

// ── Main Presenter Component ──────────────────────────────────────────────────

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
  onQuickPillSelect,
}: JourneyPlannerViewProps) {
  const cityKey = activeCity?.toLowerCase() || "delhi";
  const currentMeta = CITY_METADATA[cityKey] || CITY_METADATA.delhi;
  const originPlaceholder = currentMeta.quickPills?.[0] || "Select origin station";
  const destPlaceholder =
    currentMeta.quickPills?.[currentMeta.quickPills.length - 1] || "Select destination station";
  const quickPills = currentMeta.quickPills || [];

  const canSearch =
    (!!originId || origin.trim().length >= 2) &&
    (!!destinationId || destination.trim().length >= 2) &&
    origin.trim() !== destination.trim();

  return (
    <aside className="w-full h-full flex flex-col bg-[#0b0f17]/95 backdrop-blur-2xl border-r border-white/[0.08] overflow-hidden select-none">
      {/* ── Top Input Section ─────────────────────────────────── */}
      <div className="p-5 border-b border-white/[0.08] bg-[#151b28]/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-bold text-white tracking-tight">Plan a Journey</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              PLANNER
            </span>
          </div>
        </div>

        {/* Inputs Box with Reverse Button */}
        <div className="relative bg-[#080c14]/80 rounded-xl p-2 border border-white/[0.08] space-y-1.5">
          {/* Flip / Swap Button */}
          <button
            onClick={onSwap}
            suppressHydrationWarning
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#151b28] border border-white/[0.12] flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:border-cyan-400/50 transition-all z-20 shadow-lg active:scale-95 cursor-pointer"
            title="Reverse Origin & Destination"
          >
            <span className="material-symbols-outlined text-[18px]">swap_vert</span>
          </button>

          {/* Origin */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#1e2638]/40 pr-12">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                ORIGIN
              </div>
              <StationSearchInput
                value={origin}
                onChange={onOriginChange}
                onSelectStation={onSelectOriginStation}
                activeCity={activeCity}
                placeholder={originPlaceholder}
                inputClassName="w-full bg-transparent text-sm font-semibold text-white focus:outline-none truncate p-0 border-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="w-0.5 h-2 bg-slate-700 ml-5 -my-0.5 rounded-full" />

          {/* Destination */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#1e2638]/40 pr-12">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                DESTINATION
              </div>
              <StationSearchInput
                value={destination}
                onChange={onDestinationChange}
                onSelectStation={onSelectDestinationStation}
                activeCity={activeCity}
                placeholder={destPlaceholder}
                inputClassName="w-full bg-transparent text-sm font-semibold text-white focus:outline-none truncate p-0 border-none placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Station Suggestions */}
        {quickPills.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2.5 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider shrink-0">
              Popular:
            </span>
            {quickPills.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => onQuickPillSelect?.(pill)}
                className="px-2 py-0.5 rounded-md bg-[#1e2638]/60 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/30 text-[10.5px] font-medium whitespace-nowrap transition-all cursor-pointer"
              >
                {pill}
              </button>
            ))}
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mt-2.5 flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </div>
        )}

        {/* Get Directions Button */}
        <button
          onClick={onSearchRoute}
          disabled={loading || !canSearch}
          className={`w-full mt-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            canSearch && !loading
              ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:brightness-110 active:scale-[0.99]"
              : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-slate-900 font-bold">
              <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              Calculating optimal journeys...
            </span>
          ) : (
            <>
              <span>Get Directions</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </div>

      {/* ── Scrollable Candidates List & Turn-by-Turn ────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3.5">
        {/* Candidates Header */}
        {!loading && routes.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              {routes.length} Route{routes.length !== 1 ? "s" : ""} Found
            </span>
            <span className="text-[11px] font-mono text-cyan-400/90 font-medium">
              {activeRouteIndex !== null ? "Route focused" : "All routes on map"}
            </span>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-4 bg-[#151b28]/60 border border-white/10 rounded-2xl animate-pulse space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 w-24 bg-white/10 rounded-md" />
                  <div className="h-5 w-16 bg-white/10 rounded-md" />
                </div>
                <div className="h-8 w-20 bg-white/10 rounded-md" />
                <div className="h-6 w-full bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Candidate Cards */}
        {!loading && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="space-y-3.5"
          >
            {routes.map((route, idx) => {
              const isSelected = activeRouteIndex === idx;
              const hasSelection = activeRouteIndex !== null;
              const isDirect = route.interchanges === 0;
              const isFastest = route.attributes?.fastest;

              // Card styling depending on selected state
              const cardClass = isSelected
                ? "relative rounded-2xl border border-cyan-400/80 bg-[#151b28]/90 p-4 shadow-[0_0_24px_-4px_rgba(6,182,212,0.22),inset_0_0_0_1px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                : "group relative rounded-2xl border border-white/[0.08] bg-[#0f141f]/60 hover:bg-[#151b28]/70 hover:border-white/[0.16] p-4 cursor-pointer transition-all";

              // Badge styling
              const badgeClass = isSelected
                ? "px-2 py-0.5 rounded-md bg-cyan-400 text-slate-950 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                : isDirect
                ? "px-2 py-0.5 rounded-md bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1"
                : isFastest
                ? "px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1"
                : "px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/15 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1";

              return (
                <motion.div
                  key={route.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  className={cardClass}
                  onClick={() => onRouteSelect(idx)}
                >
                  {/* Card Header: Badge & Fare */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={badgeClass}>
                        {isSelected ? (
                          <span className="material-symbols-outlined text-[13px]">bolt</span>
                        ) : isDirect ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        ) : isFastest ? (
                          <span className="material-symbols-outlined text-[13px] text-cyan-300">bolt</span>
                        ) : null}
                        {route.label}
                      </span>
                      {hasSelection ? (
                        <span
                          className={`text-[11px] font-semibold ${
                            isSelected ? "text-cyan-400" : "text-slate-400"
                          }`}
                        >
                          {isSelected ? "Selected" : "Alternative"}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400/80 group-hover:text-cyan-400 transition-colors">
                          Click to focus
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-white text-[17px]">{route.fare}</div>
                      {route.smartCardFare && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Smart Card: {route.smartCardFare}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Travel Time & Realtime Indicator */}
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-[34px] leading-none font-extrabold text-white tracking-tight">
                      {route.durationMins}
                    </span>
                    <span className="text-sm font-medium text-slate-300">min</span>

                    {/* Tradeoff delta (for non-selected or alternative cards) */}
                    {route.tradeoffLabel && !isSelected && (
                      <span className="text-[11px] text-slate-400 ml-2 font-medium">
                        {route.tradeoffLabel}
                      </span>
                    )}

                    {/* Route Sim indicator (when selected) */}
                    {isSelected && (
                      <span className="text-[11px] font-mono text-cyan-400/90 ml-auto font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Route Sim
                      </span>
                    )}
                  </div>

                  {/* Metro Line Sequence Chips */}
                  <div className="mt-3">
                    <LegChips legs={route.legs} />
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-3">
                    <StatsGrid route={route} />
                  </div>

                  {/* Expandable Journey Details: only for selected card */}
                  <AnimatePresence>
                    {isSelected && (
                      <JourneyDetailsTimeline
                        route={route}
                        origin={origin}
                        destination={destination}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </aside>
  );
}
