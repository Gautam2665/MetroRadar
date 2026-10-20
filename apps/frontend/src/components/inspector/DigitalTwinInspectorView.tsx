"use client";

import { motion } from "framer-motion";
import { DigitalTwin } from "../../models/digitalTwin";

export interface DigitalTwinInspectorViewProps {
  digitalTwin: DigitalTwin | null;
  loading: boolean;
  activeLevel: string;
  onLevelSelect: (levelId: string) => void;
  onClose: () => void;
}

export function DigitalTwinInspectorView({
  digitalTwin,
  loading,
  activeLevel,
  onLevelSelect,
  onClose,
}: DigitalTwinInspectorViewProps) {
  if (!digitalTwin) return null;

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: "100%", opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="fixed right-6 bottom-6 w-96 max-h-[85vh] flex flex-col bg-[#0c1017]/90 border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 backdrop-blur-2xl text-[#dfe2ee] overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <span>🚇</span>
            <span>{digitalTwin.stationName}</span>
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#bac9cc] hover:text-[#dfe2ee] hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-[#bac9cc] flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin" />
          Loading station geometry & sensor twin...
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-hide text-xs">
          {/* Live Platform ETAs Tracker */}
          <div className="p-3 bg-[#141822]/70 rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#bac9cc] uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Live Platforms</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Tracker
              </span>
            </div>

            <div className="divide-y divide-white/5 rounded-lg bg-[#080E18] border border-white/5 overflow-hidden">
              {digitalTwin.platformEtas && digitalTwin.platformEtas.length > 0 ? (
                digitalTwin.platformEtas.map((eta, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 flex justify-between items-center hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#dfe2ee]">{eta.platform}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-[11px] text-[#bac9cc]">Towards {eta.towards}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {eta.etaMins === null || eta.etaMins === undefined ? (
                        <span className="text-[11px] text-[#bac9cc] block font-semibold">Service Closed</span>
                      ) : eta.etaMins <= 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Arriving now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-[#00E5FF] font-bold text-xs border border-sky-500/20">
                          in {eta.etaMins} min
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2.5 text-xs text-slate-400">Regular revenue schedule active</div>
              )}
            </div>
          </div>

          {/* Gates & Wayfinding Grouped List */}
          <div className="p-3 bg-[#141822]/70 rounded-xl border border-white/10 space-y-2">
            <span className="text-xs font-bold text-[#bac9cc] uppercase tracking-wider flex items-center gap-1.5">
              <span>🚪</span>
              <span>
                Gates &amp; Wayfinding {digitalTwin.exits && digitalTwin.exits.length > 0 ? `(${digitalTwin.exits.length} Gates)` : ""}
              </span>
            </span>

            <div className="space-y-2.5">
              {digitalTwin.exits && digitalTwin.exits.length > 0 ? (
                Object.entries(
                  digitalTwin.exits.reduce<Record<string, typeof digitalTwin.exits>>((acc, exit) => {
                    const side = exit.concourseSide || "CONCOURSE GATES";
                    if (!acc[side]) acc[side] = [];
                    acc[side].push(exit);
                    return acc;
                  }, {})
                ).map(([concourseSide, exits]) => (
                  <div key={concourseSide} className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-1 pb-0.5 border-b border-white/5">
                      {concourseSide}
                    </div>
                    <div className="space-y-1">
                      {exits.map((exit, idx) => {
                        const displayName =
                          exit.name && exit.name !== exit.gate
                            ? exit.name.replace(/^.*Gate\s*[A-Z0-9]+\s*[-:·]\s*/i, "").trim() || exit.name
                            : `Gate ${exit.gate}`;

                        return (
                          <div
                            key={exit.id || idx}
                            className="flex items-start justify-between gap-2 py-1 px-2 rounded hover:bg-white/5 transition"
                          >
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <span className="font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-800/40 px-1.5 py-0.5 rounded text-[11px] shrink-0 mt-0.5">
                                {exit.gate}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-slate-300 text-xs leading-snug break-words">
                                  {displayName}
                                </span>
                                {exit.isRailInterchange && (
                                  <span className="ml-1.5 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0 inline-flex items-center gap-1">
                                    🚆 Suburban Link
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-1 mt-0.5">
                              {exit.hasLift && (
                                <span
                                  className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded flex items-center gap-0.5"
                                  title="Step-Free Lift Available"
                                >
                                  🛗 Lift
                                </span>
                              )}
                              {exit.hasEscalator && (
                                <span
                                  className="text-[10px] font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.2 rounded flex items-center gap-0.5"
                                  title="Escalator Available"
                                >
                                  ⚡ Esc
                                </span>
                              )}
                              {typeof exit.distanceMeter === "number" && exit.distanceMeter > 0 && (
                                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">directions_walk</span>
                                  {exit.distanceMeter}m
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#bac9cc]/60 px-1">All standard concourse gates open</p>
              )}
            </div>
          </div>

          {/* Station Amenities Grid */}
          <div className="p-3 bg-[#141822]/70 rounded-xl border border-white/10 space-y-2">
            <span className="text-xs font-bold text-[#bac9cc] uppercase tracking-wider flex items-center gap-1.5">
              <span>🏢</span>
              <span>Station Amenities</span>
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#080E18] border border-white/5 text-slate-200">
                <span className="text-sm shrink-0">🛗</span>
                <span className="text-[11px] font-medium truncate">Lifts (All levels)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#080E18] border border-white/5 text-slate-200">
                <span className="text-sm shrink-0">🚻</span>
                <span className="text-[11px] font-medium truncate">Washrooms (L1)</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#080E18] border border-white/5 text-slate-200">
                <span className="text-sm shrink-0">🚰</span>
                <span className="text-[11px] font-medium truncate">Drinking Water</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#080E18] border border-white/5 text-slate-200">
                <span className="text-sm shrink-0">🏧</span>
                <span className="text-[11px] font-medium truncate">ATM Counter</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#080E18] border border-white/5 text-slate-200">
                <span className="text-sm shrink-0">🩺</span>
                <span className="text-[11px] font-medium truncate">First Aid Desk</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#080E18] border border-white/5 text-slate-200">
                <span className="text-sm shrink-0">🎫</span>
                <span className="text-[11px] font-medium truncate">Ticket Counter</span>
              </div>
            </div>

            {/* Level Switcher */}
            {digitalTwin.levels && digitalTwin.levels.length > 0 && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Levels</span>
                <div className="flex gap-1">
                  {digitalTwin.levels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => onLevelSelect(level.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                        activeLevel === level.id
                          ? "bg-[#00e5ff] text-[#00363d] shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                          : "bg-white/5 text-[#bac9cc] hover:text-[#dfe2ee] hover:bg-white/10"
                      }`}
                    >
                      {level.levelNumber ?? level.id}: {level.name.replace(/^(Station\s+|Metro\s+)/i, "").split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
