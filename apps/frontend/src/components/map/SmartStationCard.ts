/**
 * TransitOS — Smart Station Card Renderer
 * Generates clean, passenger-facing HTML for the Smart Station Card matching Stitch specifications.
 * Supports 4 explicit modes:
 *  - NORMAL: standard passenger station
 *  - INTERCHANGE: network interchange station
 *  - JOURNEY_TRANSFER: transfer station on the active candidate route
 *  - JOURNEY_DIRECT_PASS_THROUGH: through-station on active direct route
 */

import {
  CleanStationLine,
  SmartStationCardMode,
  JourneyStationContext,
} from "../../utils/transitPresenter";

export interface StationCardData {
  id: string;
  name: string;
  code?: string;
  city?: string;
  lines: CleanStationLine[];
  wheelchairAccessible?: boolean;
  levelsCount?: number;
  exitsCount?: number;
  platformsCount?: number;
  lineInfrastructure?: Array<{
    lineId: string;
    lineCode: string;
    lineName: string;
    color?: string;
    levelsCount: number;
    levelsEvidenceStatus: string;
    platformsCount: number;
    platformsEvidenceStatus: string;
  }>;
  isInterchange: boolean;
  mode: SmartStationCardMode;
  journeyContext?: JourneyStationContext | null;
}

/**
 * Generates HTML string for the Smart Station Card matching Stitch design.
 */
export function renderSmartStationCardHtml(data: StationCardData): string {
  const stationName = data.name.toUpperCase();
  const exitText = typeof data.exitsCount === "number" ? `${data.exitsCount} exits` : "Exits unknown";
  const platformText = typeof data.platformsCount === "number" && data.platformsCount > 0
    ? `${data.platformsCount} platforms`
    : "Platforms unknown";
  const isAccessible = data.wheelchairAccessible !== false;
  const accessText = data.wheelchairAccessible === undefined ? "Accessibility unknown" : isAccessible ? "Accessible" : "Standard access";
  const levelText = typeof data.levelsCount === "number" && data.levelsCount > 0
    ? `${data.levelsCount} levels`
    : "Levels unknown";
  const lineInfrastructureHtml = data.lineInfrastructure?.length
    ? data.lineInfrastructure.map((line) => {
        const evidenceLabel = (status: string) => {
          if (status.includes("PROPOSED_DPR")) return "proposed";
          if (status === "VERIFIED" || status === "OPERATOR_CONFIRMED_AS_BUILT") return "verified";
          return status === "UNKNOWN" ? "unknown" : "unverified";
        };
        const levels = line.levelsCount > 0
          ? `${line.levelsCount} levels · ${evidenceLabel(line.levelsEvidenceStatus)}`
          : "levels unknown";
        const platforms = line.platformsCount > 0
          ? `${line.platformsCount} platforms · ${evidenceLabel(line.platformsEvidenceStatus)}`
          : "platforms unknown";
        const color = line.color || "#94a3b8";
        return `<div class="flex items-center justify-between gap-2"><span class="truncate" style="color:${color}">${line.lineName}</span><span class="shrink-0 text-slate-300">${levels} · ${platforms}</span></div>`;
      }).join("")
    : null;

  // Badge in top right: TRANSFER or STATION
  const typeBadgeText = data.isInterchange ? "TRANSFER" : "STATION";
  const typeBadgeClass = data.isInterchange
    ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
    : "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30";

  // Build connecting clean line badges
  const lineBadgesHtml = (data.lines && data.lines.length > 0)
    ? data.lines
        .map((l) => {
          const color = l.color || "#059DB2";
          return `
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-semibold border"
                  style="background-color: ${color}20; color: ${color}; border-color: ${color}45;">
              <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${color};"></span>
              ${l.name}
            </span>
          `;
        })
        .join("")
    : `
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          Metro Line
        </span>
      `;

  // Context-Aware Active Journey Context Pill
  let journeyContextPillHtml = "";

  if (data.mode === "JOURNEY_TRANSFER" && data.journeyContext) {
    const jc = data.journeyContext;
    const targetColor = jc.outgoingColor || "#0ea5e9";
    const targetLine = jc.outgoingLine || "Connecting Line";
    const platformStr = jc.platform ? ` · Platform ${jc.platform}` : "";
    const walkTime = jc.transferWalkingMins ? `${jc.transferWalkingMins} min` : "~3 min";

    journeyContextPillHtml = `
      <div class="mt-2.5 pt-2 border-t border-white/[0.08]">
        <div class="rounded-xl bg-cyan-950/50 border border-cyan-400/40 p-2.5 text-[11px]">
          <div class="text-[9px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            YOUR JOURNEY (${jc.candidateLabel || "Selected Route"})
          </div>
          <div class="text-white font-semibold mt-1 text-[11.5px]">
            Change here: ${jc.incomingLine || "Incoming"} → <span style="color: ${targetColor}">${targetLine}</span>${platformStr}
          </div>
          <div class="text-slate-400 text-[10px] mt-0.5 font-mono flex items-center gap-1">
            <span>🚶</span> Est. transfer: ~${walkTime} walking
          </div>
        </div>
      </div>
    `;
  } else if (data.mode === "JOURNEY_DIRECT_PASS_THROUGH" && data.journeyContext) {
    const jc = data.journeyContext;
    const directLine = jc.directLine || "Direct Line";
    const destName = jc.destination ? ` continuing to ${jc.destination}` : "";

    journeyContextPillHtml = `
      <div class="mt-2.5 pt-2 border-t border-white/[0.08]">
        <div class="rounded-xl bg-purple-950/50 border border-purple-400/40 p-2.5 text-[11px]">
          <div class="text-[9px] font-mono uppercase tracking-wider text-purple-300 font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-purple-400"></span>
            THROUGH STATION · DIRECT RUN (${jc.candidateLabel || "Direct Route"})
          </div>
          <div class="text-white font-medium mt-1">
            Stay on train · No transfer required at ${data.name}
          </div>
          <div class="text-purple-300/80 text-[10.5px] mt-0.5 font-mono">
            Direct ${directLine}${destName}
          </div>
        </div>
      </div>
    `;
  }

  // Quick Action Buttons
  const actionsHtml = `
    <div class="mt-3 pt-2 border-t border-white/[0.08] flex items-center justify-between gap-1.5">
      <button type="button" data-action="set-origin" class="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-300 text-[10px] font-bold border border-white/[0.1] transition text-center cursor-pointer active:scale-95">
        + Origin
      </button>
      <button type="button" data-action="set-dest" class="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800/90 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-[10px] font-bold border border-white/[0.1] transition text-center cursor-pointer active:scale-95">
        + Dest
      </button>
      <button type="button" data-action="view-network" class="py-1.5 px-2.5 rounded-lg bg-slate-800/90 hover:bg-white/20 text-slate-400 hover:text-white text-[10px] font-mono border border-white/[0.1] transition text-center cursor-pointer active:scale-95" title="Digital Twin Layout">
        Twin ↗
      </button>
    </div>
  `;

  // Full Container matching Stitch Compact Card
  return `
    <div class="smart-station-card-interactive p-3.5 bg-[#0f141f]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-2xl text-left select-none text-slate-200 min-w-[280px] max-w-[320px]">
      <!-- Header row: Station Name + Type Badge -->
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full ${data.isInterchange ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : "bg-fuchsia-400 shadow-[0_0_8px_#e879f9]"}"></span>
          <span class="text-[13px] font-bold text-white tracking-wide truncate font-sans">${stationName}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border shrink-0 ${typeBadgeClass}">
          ${typeBadgeText}
        </span>
      </div>

      <!-- Connecting Lines Badges -->
      <div class="flex flex-wrap items-center gap-1.5 mb-2.5">
        ${lineBadgesHtml}
      </div>

      <!-- Station Infrastructure Specs -->
      <div class="text-[11px] text-slate-400 space-y-1 font-mono">
        <div class="flex items-center gap-1.5">
          <span>${data.isInterchange ? "⇄" : "•"}</span>
          <span>${data.isInterchange ? "Transfer station" : "Station"} · ${levelText} · ${platformText}</span>
        </div>
        <div class="flex items-center gap-2 text-[10px] text-slate-400/90">
          <span>${exitText}</span>
          <span>·</span>
          <span class="${isAccessible ? "text-emerald-400 font-medium" : ""}">${isAccessible ? "♿ " : ""}${accessText}</span>
        </div>
      </div>

      <!-- Active Journey Context (if relevant) -->
      ${journeyContextPillHtml}

      <!-- Action buttons -->
      ${actionsHtml}
    </div>
  `;
}
