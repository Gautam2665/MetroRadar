/**
 * TransitOS — Transit Formatter Utilities
 * Clean, user-friendly formatting for metro lines, train directions, and step-by-step itineraries.
 */

import { RouteLeg } from "../containers/JourneyPlannerContainer";

/**
 * Clean up raw GTFS line names into short, user-friendly labels.
 * Examples:
 *  - "ORANGE/AIRPORT_Dwarka Sector - 21 to New Delhi" -> "Airport Express (Orange Line)"
 *  - "PINK_Shiv Vihar to Majlis Park" -> "Pink Line"
 *  - "YELLOW_Samaypur Badli to Huda City Centre" -> "Yellow Line"
 *  - "BLUE_Dwarka Sector - 21 to Noida Electronic City" -> "Blue Line"
 *  - "RED_Rithala to Shaheed Sthal" -> "Red Line"
 *  - "GREEN_Inderlok to Brigadier Hoshiar Singh" -> "Green Line"
 *  - "VIOLET_Kashmere Gate to Raja Nahar Singh" -> "Violet Line"
 *  - "MAGENTA_Janakpuri West to Botanical Garden" -> "Magenta Line"
 *  - "AQUA_Noida Sector 51 to Depot" -> "Aqua Line"
 *  - "GREY_Dwarka to Dhansa Bus Stand" -> "Grey Line"
 *  - "RAPID_Sikanderpur to Sector 55-56" -> "Rapid Metro"
 */
export function formatLineName(rawName: string | null | undefined, mode?: string): string {
  if (!rawName || mode === "walk") return "Walk / Transfer";
  const str = rawName.trim();
  const upper = str.toUpperCase();

  if (upper.includes("AIRPORT EXPRESS") || upper.startsWith("ORANGE/AIRPORT") || upper.includes("AIRPORT LINE")) {
    return "Airport Express (Orange Line)";
  }
  if (upper.startsWith("ORANGE_") || upper.includes("ORANGE LINE") || upper.includes("LINE (ORANGE)") || upper.includes("AUTOMOTIVE") || upper.includes("KHAPRI")) {
    return "Orange Line";
  }
  if (upper.includes("MONORAIL")) return "Monorail";
  if (upper.startsWith("PURPLE_") || upper.includes("PURPLE LINE") || upper.includes("PCMC") || upper.includes("SWARGATE")) return "Purple Line";
  if (upper.startsWith("PINK_") || upper.includes("PINK LINE")) return "Pink Line";
  if (upper.startsWith("YELLOW_") || upper.includes("YELLOW LINE") || upper.includes("LINE 2A") || upper.includes("LINE 2B")) return "Yellow Line";
  if (upper.startsWith("BLUE_") || upper.includes("BLUE LINE") || upper.includes("LINE 1 (BLUE)")) return "Blue Line";
  if (upper.startsWith("RED_") || upper.includes("RED LINE") || upper.includes("LINE 7") || upper.includes("LINE 9")) return "Red Line";
  if (upper.startsWith("GREEN_") || upper.includes("GREEN LINE")) return "Green Line";
  if (upper.startsWith("VIOLET_") || upper.includes("VIOLET LINE")) return "Violet Line";
  if (upper.startsWith("MAGENTA_") || upper.includes("MAGENTA LINE")) return "Magenta Line";
  if (upper.startsWith("AQUA_") || upper.includes("AQUA LINE") || upper.includes("LINE 3") || upper.includes("LINE 2 (AQUA)") || upper.includes("LOKMANYA") || upper.includes("PRAJAPATI") || upper.includes("VANAZ") || upper.includes("RAMWADI")) return "Aqua Line";
  if (upper.includes("BELAPUR") || upper.includes("PENDHAR")) return "Navi Mumbai Line 1";
  if (upper.startsWith("GREY_") || upper.startsWith("GRAY_") || upper.includes("GREY LINE")) return "Grey Line";
  if (upper.startsWith("RAPID_") || upper.includes("RAPID METRO")) return "Rapid Metro";
  if (upper.includes("KOCHI")) return "Kochi Metro Line";

  // Generic prefix matching: "PREFIX_Origin to Dest"
  const prefixMatch = str.match(/^([A-Za-z0-9\s/]+)_(.*)$/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    return capitalized.includes("Line") || capitalized.includes("Metro") ? capitalized : `${capitalized} Line`;
  }

  return str || "Metro Line";
}

/**
 * Short badge name for compact pill displays (e.g. "Airport Express", "Pink Line", "Monorail").
 */
export function formatShortLineName(rawName: string | null | undefined, mode?: string): string {
  if (!rawName || mode === "walk") return "Transfer";
  const fullName = formatLineName(rawName, mode);
  if (fullName.includes("Airport Express")) return "Airport Express";
  if (fullName.toUpperCase().includes("MONORAIL")) return "Monorail";
  return fullName;
}

/**
 * Extract train headsign / direction ("Towards [Destination]") from raw line string.
 */
export function extractDirection(rawLineName: string | null | undefined, fallbackToStation?: string): string {
  if (fallbackToStation && fallbackToStation.trim().length > 0) {
    return fallbackToStation.trim();
  }
  if (!rawLineName) return "";

  // Matches " to [Destination Station]"
  const toMatch = rawLineName.match(/\s+to\s+([^,]+)$/i);
  if (toMatch && toMatch[1]) {
    return toMatch[1].trim();
  }

  return "";
}

export type ItineraryStep = {
  type: "board" | "transfer" | "alight";
  stationName: string;
  lineBadge?: string;
  direction?: string;
  detail: string;
  stopsCount?: number;
  duration?: string;
  icon: string;
  color: string;
};

/**
 * Build clean, human-friendly step-by-step directions for the itinerary breakdown.
 */
export function buildStepByStepItinerary(
  legs: RouteLeg[],
  origin: string,
  destination: string,
  totalDuration?: string
): ItineraryStep[] {
  const steps: ItineraryStep[] = [];
  if (!legs || legs.length === 0) return steps;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const isFirst = i === 0;
    const isWalk = leg.mode === "walk" || leg.type === "WALK" || leg.type === "TRANSFER";
    const nextLeg = legs[i + 1];

    if (isWalk) {
      const fromStn = leg.fromStation || (i > 0 ? legs[i - 1].toStation : origin);
      const toStn = leg.toStation || (nextLeg ? nextLeg.fromStation : "");
      const nextLineName = nextLeg ? formatShortLineName(nextLeg.rawLineName || nextLeg.line) : "";
      
      steps.push({
        type: "transfer",
        stationName: `Transfer at ${fromStn}`,
        detail: toStn && toStn !== fromStn
          ? `Walk towards ${toStn}${nextLineName ? ` (${nextLineName})` : ""}${leg.durationMins ? ` · ${leg.durationMins} min walk` : ""}`
          : `Change to ${nextLineName || "connecting line"}${leg.durationMins ? ` · ${leg.durationMins} min` : ""}`,
        icon: "sync_alt",
        color: "#00e5ff",
        duration: leg.durationMins ? `${leg.durationMins} min` : undefined,
      });
    } else {
      const fromStn = leg.fromStation || (isFirst ? origin : "Station");
      const cleanLine = formatLineName(leg.rawLineName || leg.line);
      const shortLine = formatShortLineName(leg.rawLineName || leg.line);
      const direction = leg.towards || extractDirection(leg.rawLineName, leg.toStation);
      
      const stopsText = leg.stopsText
        ? ` · ${leg.stopsText}`
        : leg.stopsCount
        ? ` · Ride ${leg.stopsCount} stop${leg.stopsCount > 1 ? "s" : ""}`
        : "";
      const durText = leg.durationMins ? ` (${leg.durationMins} min)` : "";
      const towardsText = direction ? `Towards ${direction}` : "";

      steps.push({
        type: "board",
        stationName: isFirst ? `Board at ${fromStn}` : `Board at ${fromStn}`,
        lineBadge: shortLine,
        direction: towardsText,
        detail: towardsText
          ? `${cleanLine} · ${towardsText}${stopsText}${durText}`
          : `${cleanLine}${stopsText}${durText}`,
        stopsCount: leg.stopsCount,
        duration: leg.durationMins ? `${leg.durationMins} min` : undefined,
        icon: "directions_subway",
        color: leg.color || leg.lineColor || "#00e5ff",
      });
    }
  }

  // Destination alight step
  steps.push({
    type: "alight",
    stationName: `Alight at ${destination}`,
    detail: `Destination Arrived${totalDuration ? ` · Total ${totalDuration}` : ""}`,
    icon: "location_on",
    color: "#22c55e",
  });

  return steps;
}

export interface PathwayEdge {
  pathway_mode: number;
  length?: number | null;
  traversal_time?: number | null;
  stair_count?: number | null;
  signposted_as?: string | null;
}

export interface StopNode {
  stop_name: string;
  level_name?: string | null;
}

/**
 * Programmatically renders GTFS pathway steps from edge attributes:
 * - pathway_mode 1: Walkway / Sidewalk
 * - pathway_mode 2: Stairs
 * - pathway_mode 3: Moving Walkway / Travelator
 * - pathway_mode 4: Escalator
 * - pathway_mode 5: Lift / Elevator
 * - pathway_mode 6: Fare Gate / Turnstile (AFC)
 * - pathway_mode 7: Security Checkpoint
 */
export function formatPathwayStep(edge: PathwayEdge, toNode: StopNode): string {
  switch (edge.pathway_mode) {
    case 1: // Walkway
      return `Walk ${edge.length ?? Math.round((edge.traversal_time || 0) * 1.2)}m via ${edge.signposted_as || toNode.stop_name}`;
    case 2: // Stairs
      return `Take stairs (${edge.stair_count ?? 'steps'}) to ${toNode.stop_name}`;
    case 3: // Travelator / Moving Walkway
      return `Take moving walkway (${edge.length ?? 0}m) towards ${edge.signposted_as || toNode.stop_name}`;
    case 4: // Escalator
      return `Take escalator up/down to ${toNode.stop_name}`;
    case 5: // Lift / Elevator
      return `Take lift to ${toNode.level_name || toNode.stop_name}`;
    case 6: // Fare Gate / Turnstile
      return `Tap through AFC gates towards ${edge.signposted_as || toNode.stop_name}`;
    case 7: // Security checkpoint
      return `Clear security screening at ${toNode.stop_name}`;
    default:
      return `Proceed to ${toNode.stop_name}`;
  }
}

