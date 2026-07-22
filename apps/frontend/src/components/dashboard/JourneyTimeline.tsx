"use client";

import { Clock, Navigation, MapPin, Footprints, Train, ArrowDown } from "lucide-react";

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

export default function JourneyTimeline({ result, onClose }: JourneyTimelineProps) {
  const { journey, metadata } = result;

  return (
    <div
      className="flex flex-col h-full max-h-[80vh] w-full text-zinc-100"
      id="journey-timeline-panel"
    >
      {/* Header */}
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

      {/* Timeline Steps List */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-0.5 scrollbar-thin">
        {journey.legs.map((leg, index) => {
          const isFirst = index === 0;
          const isLast = index === journey.legs.length - 1;

          const lineColor = leg.lineColor ?? "#52525b"; // Default slate

          return (
            <div key={index} className="relative flex flex-col">
              {/* 1. Origin Station of this leg */}
              <div className="flex items-start gap-4">
                {/* Visual node */}
                <div className="relative flex flex-col items-center shrink-0 w-6">
                  {isFirst ? (
                    <div className="h-6 w-6 rounded-full border-4 border-green-500 bg-zinc-950 flex items-center justify-center shadow-lg shadow-green-500/20 z-10">
                      <MapPin size={10} className="text-green-500" />
                    </div>
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
                  <p className="text-sm font-bold text-zinc-100">
                    {leg.fromStationName}
                  </p>
                  {isFirst && (
                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                      Start Journey
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Leg Action details (e.g. Ride train / walk) */}
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

                {/* Travel Info Card */}
                <div className="flex-1 py-3 pl-3 pr-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 flex items-center gap-3.5 mr-2">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-center">
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
                            className="text-xs font-black px-2 py-0.5 rounded shadow-sm"
                            style={{ backgroundColor: `${lineColor}22`, color: lineColor }}
                          >
                            {leg.lineName}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {leg.lineCode}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 font-medium">
                          Ride {leg.stationsCount} station{leg.stationsCount > 1 ? "s" : ""}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-emerald-400">
                          Walk Connection
                        </span>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Transfer to {leg.toStationName}
                        </p>
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-bold text-zinc-400 shrink-0">
                    {formatDuration(leg.duration)}
                  </span>
                </div>
              </div>

              {/* 3. Final Destination Station (only if this is the last leg) */}
              {isLast && (
                <div className="flex items-start gap-4 mt-1">
                  {/* Destination Node */}
                  <div className="relative flex flex-col items-center shrink-0 w-6">
                    <div className="h-6 w-6 rounded-full border-4 border-red-500 bg-zinc-950 flex items-center justify-center shadow-lg shadow-red-500/20 z-10">
                      <Navigation size={10} className="text-red-500" />
                    </div>
                  </div>

                  {/* Station Name */}
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-bold text-zinc-100">
                      {leg.toStationName}
                    </p>
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                      Destination Arrived
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
