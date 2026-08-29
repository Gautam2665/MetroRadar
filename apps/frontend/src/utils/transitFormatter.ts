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

  if (upper.includes("ORANGE") || upper.includes("AIRPORT")) {
    return "Airport Express (Orange Line)";
  }
  if (upper.startsWith("PINK_") || upper.includes("PINK LINE")) return "Pink Line";
  if (upper.startsWith("YELLOW_") || upper.includes("YELLOW LINE") || upper.includes("LINE 2A")) return "Yellow Line";
  if (upper.startsWith("BLUE_") || upper.includes("BLUE LINE") || upper.includes("LINE 1")) return "Blue Line";
  if (upper.startsWith("RED_") || upper.includes("RED LINE") || upper.includes("LINE 7")) return "Red Line";
  if (upper.startsWith("GREEN_") || upper.includes("GREEN LINE")) return "Green Line";
  if (upper.startsWith("VIOLET_") || upper.includes("VIOLET LINE")) return "Violet Line";
  if (upper.startsWith("MAGENTA_") || upper.includes("MAGENTA LINE")) return "Magenta Line";
  if (upper.startsWith("AQUA_") || upper.includes("AQUA LINE")) return "Aqua Line";
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
 * Short badge name for compact pill displays (e.g. "Airport Express", "Pink Line").
 */
export function formatShortLineName(rawName: string | null | undefined, mode?: string): string {
  if (!rawName || mode === "walk") return "Transfer";
  const fullName = formatLineName(rawName, mode);
  if (fullName.includes("Airport Express")) return "Airport Express";
  return fullName;
}

/**
 * Extract train headsign / direction ("Towards [Destination]") from raw line string.
 * Example: "ORANGE/AIRPORT_Dwarka Sector - 21 to New Delhi" -> "New Delhi"
 * Example: "PINK_Shiv Vihar to Majlis Park" -> "Majlis Park"
 */
export function extractDirection(rawLineName: string | null | undefined, fallbackToStation?: string): string {
  if (!rawLineName) return fallbackToStation || "";
  
  // Matches " to [Destination Station]"
  const toMatch = rawLineName.match(/\s+to\s+([^,]+)$/i);
  if (toMatch && toMatch[1]) {
    return toMatch[1].trim();
  }

  return fallbackToStation || "";
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
      
      const stopsText = leg.stopsCount ? ` · Ride ${leg.stopsCount} station${leg.stopsCount > 1 ? "s" : ""}` : "";
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
