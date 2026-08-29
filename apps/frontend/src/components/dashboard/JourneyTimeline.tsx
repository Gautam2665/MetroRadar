"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navigation, MapPin, Footprints, Train, Star, Zap, Clock, ArrowRightLeft } from "lucide-react";
import { formatLineName, extractDirection } from "../../utils/transitFormatter";

type JourneyLeg = {
  from: string;
  fromStationName: string;
  to: string;
  toStationName: string;
  type: "TRANSIT" | "TRANSFER" | "WALK";
  duration: number; // seconds
  lineId: string | null;
  lineName: string | null;
  lineColor: string | null;
  lineCode: string | null;
  stationsCount: number;
};

type JourneyResult = {
  metadata: {
    from: { name: string; code: string };
    to: { name: string; code: string };
    algorithm: string;
  };
  journey: {
    score: number;
    duration: number; // minutes
    durationSeconds: number;
    transfers: number;
    legs: JourneyLeg[];
  };
};

type JourneyTimelineProps = {
  result: JourneyResult;
  onClose: () => void;
};

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function getScoreColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 65) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "Optimal";
  if (score >= 65) return "Good";
  return "Fair";
}

/** Stagger container variant */
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

/** Individual leg card variant */
const legVariants = {
  hidden: { opacity: 0, x: -18, scale: 0.97 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 340, damping: 26 },
  },
};

export default function JourneyTimeline({ result, onClose }: JourneyTimelineProps) {
  const { journey } = result;
  const score = journey.score ?? 72;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="flex flex-col h-full max-h-[80vh] w-full text-zinc-100"
        id="journey-timeline-panel"
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-950/20 shrink-0">
          <div>
            <h3 className="text-sm font-bold tracking-wide uppercase text-sky-400">
              Journey Directions
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {journey.duration} min · {journey.transfers} transfer{journey.transfers !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition"
          >
            Hide
          </button>
        </div>

        {/* ── Quality Score Badge Strip ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 300, damping: 22 }}
          className="px-5 py-3 border-b border-zinc-800/50 bg-zinc-900/30 flex items-center gap-3 flex-wrap shrink-0"
        >
          {/* Route score pill */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold"
            style={{
              backgroundColor: `${scoreColor}18`,
              borderColor: `${scoreColor}40`,
              color: scoreColor,
            }}
          >
            <Star size={11} fill={scoreColor} />
            {score} · {scoreLabel} Route
          </div>

          {/* Duration badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-bold">
            <Clock size={11} />
            {journey.duration} min total
          </div>

          {/* Transfers badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold">
            <ArrowRightLeft size={11} />
            {journey.transfers} transfer{journey.transfers !== 1 ? "s" : ""}
          </div>

          {/* Algorithm badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-bold ml-auto">
            <Zap size={11} />
            Dijkstra
          </div>
        </motion.div>

        {/* ── Timeline Steps List ───────────────────────────────── */}
        <motion.div
          className="flex-1 overflow-y-auto px-5 py-5 space-y-0.5 scrollbar-thin"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {journey.legs.map((leg, index) => {
            const isFirst = index === 0;
            const isLast = index === journey.legs.length - 1;
            const lineColor = leg.lineColor ?? "#52525b";

            return (
              <motion.div key={index} variants={legVariants} className="relative flex flex-col">
                {/* 1. Origin Station of this leg */}
                <div className="flex items-start gap-4">
                  {/* Visual node */}
                  <div className="relative flex flex-col items-center shrink-0 w-6">
                    {isFirst ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.15 }}
                        className="h-6 w-6 rounded-full border-4 border-green-500 bg-zinc-950 flex items-center justify-center z-10"
                        style={{ boxShadow: "0 0 12px rgba(34,197,94,0.35)" }}
                      >
                        <MapPin size={10} className="text-green-500" />
                      </motion.div>
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-amber-500 bg-zinc-950 z-10" />
                    )}
                    {/* Vertical connecting line */}
                    <div
                      className="absolute top-5 bottom-0 w-1"
                      style={{
                        backgroundColor: leg.type === "WALK" ? "transparent" : lineColor,
                        backgroundImage:
                          leg.type === "WALK"
                            ? "linear-gradient(to bottom, #10b981 50%, transparent 50%)"
                            : "none",
                        backgroundSize: leg.type === "WALK" ? "1px 8px" : "auto",
                      }}
                    />
                  </div>

                  {/* Station Info */}
                  <div className="flex-1 pb-2">
                    <p className="text-sm font-bold text-zinc-100">{leg.fromStationName}</p>
                    {isFirst && (
                      <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                        Start Journey
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Leg Action details */}
                <div className="flex items-start gap-4 my-1">
                  {/* Connecting track line gutter */}
                  <div className="relative flex flex-col items-center shrink-0 w-6">
                    <div
                      className="absolute top-0 bottom-0 w-1"
                      style={{
                        backgroundColor: leg.type === "WALK" ? "transparent" : lineColor,
                        backgroundImage:
                          leg.type === "WALK"
                            ? "linear-gradient(to bottom, #10b981 50%, transparent 50%)"
                            : "none",
                        backgroundSize: leg.type === "WALK" ? "1px 8px" : "auto",
                      }}
                    />
                  </div>

                  {/* Travel Info Card — glassmorphic */}
                  <motion.div
                    whileHover={{ scale: 1.015, y: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="flex-1 py-3 pl-3 pr-4 rounded-xl flex items-center gap-3.5 mr-2 cursor-default"
                    style={{
                      background:
                        leg.type === "TRANSIT"
                          ? `linear-gradient(135deg, ${lineColor}14 0%, rgba(9,9,11,0.55) 100%)`
                          : "rgba(16,185,129,0.08)",
                      border: `1px solid ${leg.type === "TRANSIT" ? lineColor + "30" : "rgba(16,185,129,0.22)"}`,
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    <div
                      className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: leg.type === "TRANSIT" ? `${lineColor}20` : "rgba(16,185,129,0.15)",
                        border: `1px solid ${leg.type === "TRANSIT" ? lineColor + "40" : "rgba(16,185,129,0.30)"}`,
                      }}
                    >
                      {leg.type === "TRANSIT" ? (
                        <Train size={15} style={{ color: lineColor }} />
                      ) : (
                        <Footprints size={15} className="text-emerald-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {leg.type === "TRANSIT" ? (
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-xs font-black px-2 py-0.5 rounded-md shadow-sm"
                              style={{ backgroundColor: `${lineColor}28`, color: lineColor }}
                            >
                              {formatLineName(leg.lineName)}
                            </span>
                            {(() => {
                              const dir = extractDirection(leg.lineName, leg.toStationName);
                              return dir ? (
                                <span className="text-[11px] text-zinc-300 font-semibold">
                                  Towards {dir}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1 font-medium">
                            Ride {leg.stationsCount} station{leg.stationsCount > 1 ? "s" : ""} to {leg.toStationName}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-emerald-400">Walk Connection</span>
                          <p className="text-[11px] text-zinc-300 mt-0.5 font-medium">
                            Walk towards {leg.toStationName}
                          </p>
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-bold text-zinc-400 shrink-0">
                      {formatDuration(leg.duration)}
                    </span>
                  </motion.div>
                </div>

                {/* 3. Final Destination Station (only on last leg) */}
                {isLast && (
                  <motion.div
                    className="flex items-start gap-4 mt-1"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 320, damping: 22 }}
                  >
                    <div className="relative flex flex-col items-center shrink-0 w-6">
                      <div
                        className="h-6 w-6 rounded-full border-4 border-red-500 bg-zinc-950 flex items-center justify-center z-10"
                        style={{ boxShadow: "0 0 12px rgba(239,68,68,0.35)" }}
                      >
                        <Navigation size={10} className="text-red-500" />
                      </div>
                    </div>

                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-bold text-zinc-100">{leg.toStationName}</p>
                      <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                        Destination Arrived
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
