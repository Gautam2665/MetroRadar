"use client";

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

  const currentLevelObj = digitalTwin.levels.find((l) => l.id === activeLevel) || digitalTwin.levels[0];

  return (
    <div className="fixed right-6 bottom-6 w-96 glass-card bg-[#1c2028]/95 border border-[#00e5ff]/30 rounded-2xl p-6 shadow-2xl z-50 animate-slide-in backdrop-blur-md text-[#dfe2ee]">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-wider">3D Digital Twin Inspector</span>
          <h3 className="text-xl font-bold text-[#dfe2ee]">{digitalTwin.stationName}</h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#bac9cc] hover:text-[#dfe2ee] transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-[#bac9cc]">Loading station geometry...</div>
      ) : (
        <div className="space-y-4">
          {/* Level Switcher Tabs */}
          <div>
            <span className="text-xs font-bold text-[#bac9cc] block mb-2 uppercase tracking-wider">Station Level View</span>
            <div className="flex gap-1 bg-[#181c24] p-1 rounded-xl border border-white/10">
              {digitalTwin.levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => onLevelSelect(level.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeLevel === level.id
                      ? "bg-[#00e5ff] text-[#00363d] shadow"
                      : "text-[#bac9cc] hover:text-[#dfe2ee]"
                  }`}
                >
                  {level.id}
                </button>
              ))}
            </div>
          </div>

          {/* Level Facilities */}
          <div className="p-3 bg-[#181c24]/80 rounded-xl border border-white/5 space-y-2">
            <h4 className="text-xs font-bold text-[#dfe2ee]">{currentLevelObj?.name}</h4>
            <div className="flex flex-wrap gap-1.5">
              {currentLevelObj?.facilities.map((fac, idx) => (
                <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#bac9cc] border border-white/5">
                  {fac}
                </span>
              ))}
            </div>
          </div>

          {/* Platform ETAs & Recommended Coach */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#bac9cc] uppercase tracking-wider block">Live Platform ETAs</span>
            {digitalTwin.platformEtas.map((eta, idx) => (
              <div key={idx} className="p-3 bg-[#181c24]/50 rounded-xl border border-white/5 flex justify-between items-center">
                <div>
                  <h5 className="text-xs font-bold text-[#dfe2ee]">{eta.platform} • {eta.towards}</h5>
                  <span className="text-[10px] text-[#00e5ff] font-bold">Recommended: {eta.recommendedCoach}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#00e5ff] block">{eta.etaMins} min</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] font-bold">
                    Crowd: {eta.crowdLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Station Exit Walking Distances */}
          <div className="border-t border-white/10 pt-3">
            <span className="text-xs font-bold text-[#bac9cc] uppercase tracking-wider block mb-2">Exits & Walking Distance</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {digitalTwin.exits.map((exit, idx) => (
                <div key={idx} className="p-2 bg-[#181c24]/40 rounded-lg border border-white/5">
                  <span className="text-[11px] font-bold text-[#dfe2ee] block">{exit.gate}</span>
                  <span className="text-[10px] text-[#bac9cc]">{exit.name} ({exit.distanceMeter}m)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
