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

      {route.crowd && route.crowdColor ? (
        <div
          className="flex items-center justify-center gap-1 font-mono font-medium"
          style={{ color: route.crowdColor }}
        >
          <span className="material-symbols-outlined text-[14px]">groups</span>
          <span>{route.crowd} crowd</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1 font-mono text-slate-500 text-[10px]">
          <span>Crowding offline</span>
        </div>
      )}
    </div>
  );
}

// ── Coach Recommendation Banner ──────────────────────────────────────────────

function CoachTip({
  coach,
  occupancy,
  destination,
}: {
  coach?: string | null;
  occupancy?: { status: string; occupancyPercent?: number } | null;
  destination?: string;
}) {
  if (!coach && !occupancy) {
    return (
      <div className="mt-3.5 rounded-xl bg-[#080c14]/50 border border-white/[0.06] p-2.5 text-center text-xs text-slate-500 font-mono">
        Live crowding &amp; carriage updates offline
      </div>
    );
  }

  const coachLabel = coach || (occupancy?.occupancyPercent ? `Coach (Capacity ${occupancy.occupancyPercent}%)` : "Coach");
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
          {occupancy?.status ? `Crowd Level: ${occupancy.status} · ` : ""}
          Nearest to exit {destText} · Saves ~3 min walking
        </div>
      </div>
    </div>
  );
}

function formatDepartureClock(minsFromNow?: number, fallbackStr?: string): string {
  if (fallbackStr && fallbackStr.trim()) {
    return fallbackStr.trim();
  }
  if (typeof minsFromNow === "number" && !isNaN(minsFromNow)) {
    const target = new Date(Date.now() + minsFromNow * 60000);
    return target.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return "";
}

function calculateArrivalTime(depClock?: string, durationMins?: number): string {
  if (!depClock || !durationMins) return "";
  const match = depClock.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return "";
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes + durationMins, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

interface CalculatedLegTiming {
  depTimestamp: number;
  depClock: string;
  etaMins: number;
  arrTimestamp: number;
  arrClock: string;
}

function calculateAllLegTimings(
  transitLegs: RouteLeg[],
  allLegs: RouteLeg[]
): CalculatedLegTiming[] {
  const now = Date.now();
  const timings: CalculatedLegTiming[] = [];

  transitLegs.forEach((leg, idx) => {
    let legDepMs: number;
    let etaMins: number;

    if (idx === 0) {
      const firstEta =
        typeof leg.realtimeEtaMins === "number" && !isNaN(leg.realtimeEtaMins)
          ? leg.realtimeEtaMins
          : 4;
      etaMins = firstEta;
      legDepMs = now + firstEta * 60000;
    } else {
      const prevStation = transitLegs[idx - 1].toStation || "";
      const curStation = leg.fromStation || prevStation;
      const walkLeg = allLegs.find(
        (l) =>
          (l.mode === "walk" || l.type === "WALK" || l.type === "TRANSFER") &&
          (l.fromStation === prevStation || l.toStation === curStation || l.fromStation === curStation)
      );
      const walkDurationMins = walkLeg?.durationMins ?? 3;
      const prevArrMs = timings[idx - 1].arrTimestamp;
      const platformArrivalMs = prevArrMs + walkDurationMins * 60000;

      const waitMins =
        typeof leg.connectionWaitMins === "number" && !isNaN(leg.connectionWaitMins)
          ? leg.connectionWaitMins
          : 3;

      legDepMs = platformArrivalMs + waitMins * 60000;
      etaMins = Math.max(1, Math.round((legDepMs - now) / 60000));
    }

    const durMins = leg.durationMins ?? 5;
    const legArrMs = legDepMs + durMins * 60000;

    const depClock = new Date(legDepMs).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const arrClock = new Date(legArrMs).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    timings.push({
      depTimestamp: legDepMs,
      depClock,
      etaMins,
      arrTimestamp: legArrMs,
      arrClock,
    });
  });

  return timings;
}

interface InterchangeDetails {
  instruction: string;
  chipBadge: string;
  isPaidArea: boolean;
}

function getInterchangeDetails(
  stationName: string,
  fromLineRaw?: string,
  toLineRaw?: string
): InterchangeDetails {
  const norm = stationName.toLowerCase().replace(/[-_()]/g, " ");
  const fromNorm = (fromLineRaw || "").toLowerCase();
  const toNorm = (toLineRaw || "").toLowerCase();

  const isL1 = fromNorm.includes("line 1") || fromNorm.includes("line1") || fromNorm.includes("blue") || toNorm.includes("line 1") || toNorm.includes("line1") || toNorm.includes("blue");
  const isL2A = fromNorm.includes("line 2a") || fromNorm.includes("line2a") || fromNorm.includes("yellow") || toNorm.includes("line 2a") || toNorm.includes("line2a") || toNorm.includes("yellow");
  const isL3 = fromNorm.includes("line 3") || fromNorm.includes("line3") || fromNorm.includes("aqua") || toNorm.includes("line 3") || toNorm.includes("line3") || toNorm.includes("aqua");
  const isL7 = fromNorm.includes("line 7") || fromNorm.includes("line7") || fromNorm.includes("red") || toNorm.includes("line 7") || toNorm.includes("line7") || toNorm.includes("red");

  // 1. Andheri West / D.N. Nagar (L2A <-> L1)
  if (norm.includes("andheri") || norm.includes("d.n. nagar") || norm.includes("dn nagar")) {
    if (isL2A || isL1 || norm.includes("west")) {
      return {
        instruction: "Cross covered Link Rd skywalk to Line 1 concourse (~180m)",
        chipBadge: "🎫 Re-tap required",
        isPaidArea: false,
      };
    }
  }

  // 2. Marol Naka (L1 <-> L3)
  if (norm.includes("marol")) {
    return {
      instruction: "Take escalators down to Line 3 underground concourse",
      chipBadge: "🎫 Re-tap required",
      isPaidArea: false,
    };
  }

  // 3. Western Express Highway / Gundavali (L1 <-> L7)
  if (norm.includes("gundavali") || norm.includes("western express highway") || norm.includes("weh")) {
    return {
      instruction: "Cross 58m covered skywalk over Western Express Highway",
      chipBadge: "🎫 Re-tap required",
      isPaidArea: false,
    };
  }

  // 4. Dahisar East (L2A <-> L7 / L9)
  if (norm.includes("dahisar")) {
    return {
      instruction: "Cross central concourse between Line 2A and Line 7 platforms",
      chipBadge: "✅ Stay inside paid area",
      isPaidArea: true,
    };
  }

  // 5. Bandra Kurla Complex (L3 <-> L2B)
  if (norm.includes("bkc") || norm.includes("bandra kurla")) {
    return {
      instruction: "Follow skywalk connector with escalators to Line 2B",
      chipBadge: "✅ Stay inside paid area",
      isPaidArea: true,
    };
  }

  // 6. Generic / Fallback
  return {
    instruction: `Follow signs to ${toLineRaw || "connecting line"} platform via concourse`,
    chipBadge: "🎫 Re-tap required",
    isPaidArea: false,
  };
}

interface ExitGateInfo {
  gate: string;
  landmarkSummary: string;
  walkNote?: string;
  isDirectFob?: boolean;
}

function getStationExitGateInfo(
  stationName: string,
  destinationQuery?: string,
  existingGuidance?: string | null
): ExitGateInfo | null {
  const stnNorm = stationName.toLowerCase().replace(/[-_()]/g, " ");
  const destNorm = (destinationQuery || "").toLowerCase();

  // Vidhan Bhawan (Line 3 Aqua Line)
  if (stnNorm.includes("vidhan") || destNorm.includes("vidhan")) {
    if (destNorm.includes("oberoi") || destNorm.includes("nariman") || destNorm.includes("marine")) {
      return {
        gate: "Gate B2 / B3",
        landmarkSummary: "The Oberoi, Mumbai & Nariman Point",
        walkNote: "Exit via Gate B2 / B3 towards Madam Cama Road (~240m walk)",
        isDirectFob: false,
      };
    }
    if (destNorm.includes("mittal") || destNorm.includes("maker")) {
      return {
        gate: "Gate B4",
        landmarkSummary: "Mittal Towers & Maker Chambers",
        walkNote: "Direct building access via Gate B4 (~10m walk)",
        isDirectFob: true,
      };
    }
    if (destNorm.includes("mantralaya") || destNorm.includes("assembly") || destNorm.includes("vidhan")) {
      return {
        gate: "Gate B1",
        landmarkSummary: "Vidhan Bhavan & Mantralaya",
        walkNote: "Exit via Gate B1 (~170m walk)",
        isDirectFob: false,
      };
    }
    if (destNorm.includes("gallery") || destNorm.includes("ngma") || destNorm.includes("modern art")) {
      return {
        gate: "Gate A3",
        landmarkSummary: "National Gallery of Modern Art",
        walkNote: "Exit via Gate A3 (~650m walk)",
        isDirectFob: false,
      };
    }
    // Default for Vidhan Bhawan station
    return {
      gate: "Gate B1 / B2 / B4",
      landmarkSummary: "Gate B1 (Vidhan Bhavan & Mantralaya) · Gate B2 (The Oberoi & Nariman Point) · Gate B4 (Mittal Towers)",
      walkNote: "Nearest exit gates configured via Mumbai Metro Line 3 Wayfinder",
      isDirectFob: false,
    };
  }

  // Churchgate (Line 3)
  if (stnNorm.includes("churchgate")) {
    if (destNorm.includes("eros") || destNorm.includes("oval")) {
      return {
        gate: "Gate B1",
        landmarkSummary: "Eros Theatre & Oval Maidan",
        walkNote: "Exit via Gate B1 (~400m walk)",
      };
    }
    return {
      gate: "Gate A1 / B1",
      landmarkSummary: "Gate A1 (WR Headquarters) · Gate B1 (Eros Theatre & Oval Maidan)",
      walkNote: "Exit via concourse pedestrian subway",
    };
  }

  // CSMT Metro (Line 3)
  if (stnNorm.includes("csmt")) {
    if (destNorm.includes("crawford") || destNorm.includes("manish")) {
      return {
        gate: "Gate B1",
        landmarkSummary: "Crawford Market & Manish Market",
        walkNote: "Exit via Gate B1 (~550m walk)",
      };
    }
    return {
      gate: "Gate A1 / B1",
      landmarkSummary: "Gate A1 (CSMT Main Terminus) · Gate B1 (Crawford Market)",
      walkNote: "Subway connection to CSMT suburban & mainline",
    };
  }

  // BKC (Line 3)
  if (stnNorm.includes("bkc") || stnNorm.includes("bandra kurla")) {
    return {
      gate: "Gate B1 / Skywalk",
      landmarkSummary: "Jio World Centre, Maker Maxity & MCA Club",
      walkNote: "Direct Skywalk access to G Block / BKC Financial District",
      isDirectFob: true,
    };
  }

  // Siddhivinayak (Line 3)
  if (stnNorm.includes("siddhivinayak")) {
    return {
      gate: "Gate B2",
      landmarkSummary: "Shree Siddhivinayak Temple",
      walkNote: "Direct 62m pedestrian access via Gate B2",
      isDirectFob: false,
    };
  }

  // Santacruz (Line 3)
  if (stnNorm.includes("santacruz")) {
    return {
      gate: "Gate B2",
      landmarkSummary: "Santacruz Railway Station (East) & Bus Station",
      walkNote: "Exit via Gate B2 (~594m walk)",
    };
  }

  // CSMIA T1 (Line 3)
  if (stnNorm.includes("terminal 1") || stnNorm.includes("t1")) {
    return {
      gate: "Gate A1",
      landmarkSummary: "Domestic Airport Terminal 1 & Taxi Pickup",
      walkNote: "Exit via Gate A1 (~600m covered path)",
    };
  }

  // CSMIA T2 (Line 3)
  if (stnNorm.includes("terminal 2") || stnNorm.includes("t2")) {
    return {
      gate: "Gate A2",
      landmarkSummary: "International Airport Terminal 2 & Car Park",
      walkNote: "Exit via Gate A2 (~200m direct terminal walkway)",
    };
  }

  // If existingGuidance contains gate information
  if (existingGuidance && /gate\s+[a-z0-9]+/i.test(existingGuidance)) {
    const match = existingGuidance.match(/gate\s+([a-z0-9,\s/]+)/i);
    return {
      gate: match ? `Gate ${match[1].trim()}` : "Exit Gate",
      landmarkSummary: destinationQuery || stationName,
      walkNote: existingGuidance,
    };
  }

  return null;
}

// ── Stitch Vertical Timeline: Journey Details ────────────────────────────────

export function JourneyDetailsTimeline({
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
  const legTimings = calculateAllLegTimings(transitLegs, route.legs);

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
        className={`relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-3 before:w-0.5 ${
          route.interchanges === 0
            ? "before:bg-[#0284c7]"
            : "before:bg-gradient-to-b before:from-emerald-400 via-amber-400 to-rose-500"
        }`}
      >
        {/* Domain Intelligence / Direct FOB Link Banner */}
        {route.destinationGuidance && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 to-emerald-950/40 border border-cyan-500/30 text-xs text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.08)] mb-3">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 mb-1">
              <span className="material-symbols-outlined text-[16px] text-cyan-400">link</span>
              <span>Direct Infrastructure Link</span>
            </div>
            <div className="text-[11.5px] text-slate-200 leading-relaxed">
              {route.destinationGuidance}
            </div>
          </div>
        )}

        {/* Step 1: Origin Boarding */}
        {transitLegs.length > 0 && (() => {
          const leg0 = transitLegs[0];
          const timing0 = legTimings[0];
          const shortLine = leg0.shortLine || formatShortLineName(leg0.line);

          return (
            <div className="relative">
              <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#151b28] shadow-[0_0_8px_#34d399]" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">
                    BOARD · {leg0.fromStation || origin}
                  </span>
                  <span
                    className="px-1.5 py-0.2 rounded text-[9px] font-bold border"
                    style={{
                      backgroundColor: `${leg0.color}25`,
                      color: leg0.color,
                      borderColor: `${leg0.color}50`,
                    }}
                  >
                    {shortLine}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Departs in {timing0.etaMins} mins ({timing0.depClock})
                  </span>
                  {leg0.delaySeconds && leg0.delaySeconds > 0 ? (
                    <span className="text-xs text-amber-400 font-mono">
                      +{(leg0.delaySeconds / 60).toFixed(0)}m delay
                    </span>
                  ) : null}
                </div>

                <div className="text-[11.5px] text-slate-300 mt-1">
                  {leg0.platform ? `${leg0.platform} · ` : "Platform 1 · "}
                  {leg0.towards
                    ? `Towards ${leg0.towards}`
                    : formatLineName(leg0.line)}
                  {leg0.platformStatus === "USER_REPORTED" ? " · user-reported" : ""}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {leg0.stopsText
                    ? leg0.stopsText
                    : leg0.stopsCount
                    ? `Ride ${leg0.stopsCount} stop${leg0.stopsCount !== 1 ? "s" : ""}`
                    : "In-vehicle transit"}
                  {leg0.durationMins ? ` (${leg0.durationMins} min)` : ""}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Intermediate notice for direct route */}
        {route.interchanges === 0 && (
          <div className="p-2.5 rounded-lg bg-[#080c14]/80 border border-white/[0.06] text-xs text-slate-300">
            <div className="font-semibold text-purple-300">No transfers required</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Stay on the same train for {totalStops} stops. Approx {route.durationMins} min runtime.
            </div>
          </div>
        )}

        {/* Transfers & Connecting Legs: Differentiated Interchange + Detailed Connecting Line Boarding */}
        {transitLegs.slice(0, -1).map((curLeg, idx) => {
          const nextLeg = transitLegs[idx + 1];
          const nextTiming = legTimings[idx + 1];
          const interchangeStation = curLeg.toStation || nextLeg.fromStation || "Transfer Station";
          const curShortLine = curLeg.shortLine || formatShortLineName(curLeg.line);
          const nextShortLine = nextLeg.shortLine || formatShortLineName(nextLeg.line);

          if (nextLeg.throughServiceContinuationFromPrevious) {
            return (
              <div key={`cont-${idx}`} className="relative">
                <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-cyan-400 bg-[#151b28] shadow-[0_0_8px_#22d3ee]" />
                <div>
                  <div className="text-xs font-bold text-cyan-200">
                    CONTINUE · {interchangeStation}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Stay on the {nextShortLine} service; no transfer is required.
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {nextLeg.stopsText || "Continue on the same train"}
                    {nextLeg.durationMins ? ` (${nextLeg.durationMins} min)` : ""}
                  </div>
                </div>
              </div>
            );
          }

          // Find intervening walk leg
          const walkLeg = route.legs.find(
            (l) =>
              (l.mode === "walk" || l.type === "WALK" || l.type === "TRANSFER") &&
              (l.fromStation === interchangeStation || l.toStation === interchangeStation)
          );

          const walkMins = walkLeg?.durationMins || 3;
          const icxDetails = getInterchangeDetails(interchangeStation, curLeg.line, nextLeg.line);

          return (
            <div key={`icx-group-${idx}`} className="space-y-4">
              {/* 1. Distinct Physical Interchange Hub Node */}
              <div className="relative">
                <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-amber-400 bg-[#151b28] shadow-[0_0_8px_#fbbf24] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </span>

                <div className="space-y-2">
                  {/* Header: Interchange Station & Line Transition */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">
                      INTERCHANGE · {interchangeStation}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-300">
                      {curShortLine} ➔ {nextShortLine}
                    </span>
                    {curLeg.doorsOpen && curLeg.doorSideStatus === "KNOWN_FROM_ENGINEERING" && (
                      <span className="text-[10.5px] text-amber-300/90 font-medium">
                        (Doors open on {curLeg.doorsOpen})
                      </span>
                    )}
                  </div>

                  {/* Clean Concise Interchange Card */}
                  <div className="p-3 rounded-xl bg-[#080c14]/90 border border-white/10 text-xs space-y-2">
                    {/* Clean Commuter Instruction */}
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0">
                        {icxDetails.instruction.toLowerCase().includes("escalator") || icxDetails.instruction.toLowerCase().includes("down")
                          ? "south"
                          : icxDetails.instruction.toLowerCase().includes("skywalk") || icxDetails.instruction.toLowerCase().includes("covered")
                          ? "alt_route"
                          : "directions_walk"}
                      </span>
                      <div className="text-xs text-slate-200 font-medium leading-snug">
                        {icxDetails.instruction}
                      </div>
                    </div>

                    {/* Micro Details Row */}
                    <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-white/5 text-[10.5px] font-mono">
                      <div className="flex items-center gap-1 text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-cyan-400">schedule</span>
                        <span>{walkMins} min transfer</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded border font-medium ${
                          icxDetails.isPaidArea
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        }`}
                      >
                        <span>{icxDetails.chipBadge}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Boarding Step for Connecting Line (Exact same detail & prominence as Leg 1) */}
              <div className="relative">
                <span
                  className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-[#151b28]"
                  style={{
                    backgroundColor: nextLeg.color || "#06b6d4",
                    boxShadow: `0 0 8px ${nextLeg.color || "#06b6d4"}`,
                  }}
                />

                <div>
                  {/* Header: BOARD Connecting Station & Line Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">
                      BOARD · {nextLeg.fromStation || interchangeStation}
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

                  {/* Green Countdown & Departure Time Pill */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Departs in {nextTiming.etaMins} mins ({nextTiming.depClock})
                    </span>
                    {nextLeg.delaySeconds && nextLeg.delaySeconds > 0 ? (
                      <span className="text-xs text-amber-400 font-mono">
                        +{(nextLeg.delaySeconds / 60).toFixed(0)}m delay
                      </span>
                    ) : null}
                  </div>

                  {/* Platform & Direction */}
                  <div className="text-[11.5px] text-slate-300 mt-1">
                    {nextLeg.platform ? `${nextLeg.platform} · ` : "Platform 1 · "}
                    {nextLeg.towards
                      ? `Towards ${nextLeg.towards}`
                      : formatLineName(nextLeg.line)}
                    {nextLeg.platformStatus === "USER_REPORTED" ? " · user-reported" : ""}
                  </div>

                  {/* Stops and Ride Duration */}
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {nextLeg.stopsText
                      ? nextLeg.stopsText
                      : nextLeg.stopsCount
                      ? `Ride ${nextLeg.stopsCount} stop${nextLeg.stopsCount !== 1 ? "s" : ""}`
                      : "In-vehicle transit"}
                    {nextLeg.durationMins ? ` (${nextLeg.durationMins} min)` : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Step Final: Destination Arrival */}
        {(() => {
          const lastTransitLeg = transitLegs[transitLegs.length - 1];
          const finalStationName = lastTransitLeg?.toStation || (route as any).destinationStation?.name || destination;
          const lastTiming = legTimings[legTimings.length - 1];
          const arrivalClock = lastTiming
            ? lastTiming.arrClock
            : calculateArrivalTime(
                formatDepartureClock(lastTransitLeg?.realtimeEtaMins, lastTransitLeg?.realtimeTimeStr),
                lastTransitLeg?.durationMins
              );
          const isLandmark = destination && destination.toLowerCase().trim() !== finalStationName.toLowerCase().trim();
          const exitGateInfo = getStationExitGateInfo(finalStationName, destination, route.destinationGuidance);

          return (
            <div className="relative">
              <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#151b28] shadow-[0_0_8px_#f43f5e]" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">
                    ARRIVE · {finalStationName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/40">
                    DESTINATION
                  </span>
                </div>

                <div className="text-[11.5px] text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                  {arrivalClock && (
                    <span className="text-emerald-400 font-mono font-semibold">
                      Arrives at {arrivalClock}
                    </span>
                  )}
                  {arrivalClock && <span className="text-slate-500">·</span>}
                  <span>
                    {lastTransitLeg?.alightingPlatform
                      ? `Alight ${lastTransitLeg.alightingPlatform}`
                      : "Alight platform"}
                  </span>
                </div>

                {/* Wayfinder Nearest Exit Gate Card */}
                {exitGateInfo ? (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#0d2238]/90 border border-cyan-500/40 text-xs text-cyan-200 shadow-sm">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                      <span className="material-symbols-outlined text-[15px] text-cyan-400">output</span>
                      <span>Wayfinder Nearest Exit: {exitGateInfo.gate}</span>
                      {exitGateInfo.isDirectFob && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/40 ml-auto">
                          Direct Access
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-200 mt-1">
                      {exitGateInfo.landmarkSummary}
                    </div>
                    {exitGateInfo.walkNote && (
                      <div className="text-[10px] text-cyan-300/80 mt-0.5 font-mono">
                        {exitGateInfo.walkNote}
                      </div>
                    )}
                  </div>
                ) : (
                  (route.destinationGuidance || isLandmark) && (
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px] text-amber-400">output</span>
                      <span>
                        {route.destinationGuidance || `Exit Gate for ${destination}`}
                      </span>
                    </div>
                  )
                )}

                {route.destinationGuidance && route.destinationGuidance.includes("FOB") && !exitGateInfo?.isDirectFob && (
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10.5px] font-semibold text-emerald-400">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    Zero street walking · Direct Skywalk Access
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Embedded Coach Guidance Tip */}
      <CoachTip coach={route.boardCoach} occupancy={route.realtimeOccupancy} destination={destination} />
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
  const cityKey = activeCity?.toLowerCase() || "mumbai";
  const currentMeta = CITY_METADATA[cityKey] || CITY_METADATA.mumbai || CITY_METADATA.delhi;
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
                suppressHydrationWarning
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
          suppressHydrationWarning
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

                  {/* GTFS-RT Live Train ETA Badges */}
                  {route.realtime && (route.realtime.primaryTrain?.label || route.realtime.followingTrain?.label) && (
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {route.realtime.primaryTrain?.label && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {route.realtime.primaryTrain.label}
                        </span>
                      )}
                      {route.realtime.followingTrain?.label && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[13px] text-cyan-400">schedule</span>
                          {route.realtime.followingTrain.label}
                        </span>
                      )}
                    </div>
                  )}

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
