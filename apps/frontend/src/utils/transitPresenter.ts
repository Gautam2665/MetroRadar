/**
 * TransitOS — Transit Presenter & Data Sanitizer
 * Strips raw GTFS/graph identifiers and provides clean passenger-facing UI presentation.
 */

import { RouteLeg, RouteOption } from '../containers/JourneyPlannerContainer';

export interface CleanStationLine {
  code: string;
  name: string;
  shortName: string;
  color: string;
}

export type SmartStationCardMode =
  | 'NORMAL'
  | 'INTERCHANGE'
  | 'JOURNEY_TRANSFER'
  | 'JOURNEY_DIRECT_PASS_THROUGH';

export interface JourneyStationContext {
  role: 'origin' | 'transfer' | 'destination' | 'direct_pass_through';
  candidateLabel: string;
  incomingLine?: string;
  incomingColor?: string;
  outgoingLine?: string;
  outgoingColor?: string;
  platform?: number | string;
  transferWalkingMins?: number;
  directLine?: string;
  destination?: string;
}

/**
 * Clean up raw GTFS/graph line names into passenger-friendly labels.
 * Example: 'ORANGE/AIRPORT_Dwarka Sector - 21 to New Delhi' -> 'Airport Express (Orange Line)'
 * Example: 'YELLOW_Samaypur Badli to Huda City Centre' -> 'Yellow Line'
 */
export function cleanLineName(rawName: string | null | undefined, mode?: string): string {
  if (!rawName || mode === 'walk') return 'Walk / Transfer';
  const str = rawName.trim();
  const upper = str.toUpperCase();

  if (upper.includes('ORANGE') || upper.includes('AIRPORT')) {
    return 'Airport Express (Orange Line)';
  }
  if (upper.includes('YELLOW') || upper.includes('LINE 2A')) return 'Yellow Line';
  if (upper.includes('BLUE') || upper.includes('LINE 1') || upper.includes('LINE 3')) return 'Blue Line';
  if (upper.includes('RED') || upper.includes('LINE 7')) return 'Red Line';
  if (upper.includes('PINK')) return 'Pink Line';
  if (upper.includes('MAGENTA')) return 'Magenta Line';
  if (upper.includes('VIOLET')) return 'Violet Line';
  if (upper.includes('GREEN')) return 'Green Line';
  if (upper.includes('AQUA')) return 'Aqua Line';
  if (upper.includes('GREY') || upper.includes('GRAY')) return 'Grey Line';
  if (upper.includes('RAPID')) return 'Rapid Metro';
  if (upper.includes('KOCHI')) return 'Kochi Metro Line';

  const prefixMatch = str.match(/^([A-Za-z0-9\s/]+)_(.*)$/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    const capitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    return capitalized.includes('Line') || capitalized.includes('Metro') ? capitalized : `${capitalized} Line`;
  }

  return str;
}

/**
 * Short badge name for compact pill displays (e.g. 'Airport Express', 'Blue Line').
 */
export function shortLineName(rawName: string | null | undefined, mode?: string): string {
  if (!rawName || mode === 'walk') return 'Transfer';
  const fullName = cleanLineName(rawName, mode);
  if (fullName.includes('Airport Express')) return 'Airport Express';
  return fullName;
}

/**
 * Resolve authentic line hex color from line name.
 */
export function resolveLineColor(rawName: string | null | undefined, fallback?: string): string {
  const upper = (rawName || '').toUpperCase();
  if (upper.includes('ORANGE') || upper.includes('AIRPORT')) return '#f97316';
  if (upper.includes('YELLOW') || upper.includes('LINE 2A')) return '#facc15';
  if (upper.includes('BLUE') || upper.includes('LINE 1') || upper.includes('LINE 3')) return '#3b82f6';
  if (upper.includes('RED') || upper.includes('LINE 7')) return '#ef4444';
  if (upper.includes('PINK')) return '#ec4899';
  if (upper.includes('MAGENTA')) return '#d946ef';
  if (upper.includes('VIOLET')) return '#8b5cf6';
  if (upper.includes('GREEN')) return '#22c55e';
  if (upper.includes('AQUA')) return '#06b6d4';
  if (upper.includes('GREY') || upper.includes('GRAY')) return '#808080';
  if (upper.includes('RAPID')) return '#14b8a6';
  if (upper.includes('KOCHI')) return '#0ea5e9';
  return fallback || '#06b6d4';
}

/**
 * Clean direction label (strips internal GTFS prefixes).
 */
export function cleanDirection(rawLineName: string | null | undefined, fallbackToStation?: string): string {
  if (!rawLineName) return fallbackToStation || '';
  const toMatch = rawLineName.match(/\s+to\s+([^,]+)$/i);
  if (toMatch && toMatch[1]) {
    return toMatch[1].trim();
  }
  return fallbackToStation || '';
}

/**
 * Normalizes station lines from raw properties.
 * CRITICAL: Deduplicates distinct trip directions of the SAME line into one clean line entry!
 * Prevents 'Shivaji Stadium' from showing 2 boxes of 'ORANGE/AIRPORT_...'
 */
export function normalizeStationLines(
  rawLines: unknown
): CleanStationLine[] {
  let parsed: Array<{ code?: string; name?: string; color?: string }> = [];

  if (typeof rawLines === 'string') {
    try {
      parsed = JSON.parse(rawLines);
    } catch {
      parsed = [];
    }
  } else if (Array.isArray(rawLines)) {
    parsed = rawLines;
  }

  const seen = new Set<string>();
  const cleanList: CleanStationLine[] = [];

  for (const item of parsed) {
    if (!item || !item.name) continue;
    const clean = cleanLineName(item.name);
    const short = shortLineName(item.name);
    const color = resolveLineColor(item.name, item.color);
    const code = item.code || short.slice(0, 3).toUpperCase();

    if (!seen.has(short)) {
      seen.add(short);
      cleanList.push({
        code,
        name: clean,
        shortName: short,
        color,
      });
    }
  }

  return cleanList;
}

/**
 * Normalizes a station name for fuzzy/exact matching.
 * 'Dwarka Sector - 21' -> 'dwarka sector 21'
 */
export function normalizeStationName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two station names match.
 */
export function isStationMatch(nameA: string | null | undefined, nameB: string | null | undefined): boolean {
  const normA = normalizeStationName(nameA);
  const normB = normalizeStationName(nameB);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
}

/**
 * Derives journey context for a station given the selected candidate.
 * Explicitly determines whether the station is:
 * 1. An interchange/transfer for this specific journey (JOURNEY_TRANSFER)
 * 2. An intermediate passed-through station on a direct run (JOURNEY_DIRECT_PASS_THROUGH)
 * 3. Origin or destination
 * 4. Not relevant to this journey (null)
 */
export function deriveJourneyStationContext(
  stationName: string,
  selectedCandidate: RouteOption | null
): JourneyStationContext | null {
  if (!selectedCandidate || !selectedCandidate.legs || selectedCandidate.legs.length === 0) {
    return null;
  }

  const legs = selectedCandidate.legs;
  const transitLegs = legs.filter((l) => l.mode !== 'walk' && l.type !== 'WALK');

  // 1. Check if it's a transfer station between transit legs
  for (let i = 0; i < transitLegs.length - 1; i++) {
    const curLeg = transitLegs[i];
    const nextLeg = transitLegs[i + 1];

    if (
      isStationMatch(curLeg.toStation, stationName) ||
      isStationMatch(nextLeg.fromStation, stationName)
    ) {
      return {
        role: 'transfer',
        candidateLabel: selectedCandidate.label || 'Selected Route',
        incomingLine: shortLineName(curLeg.rawLineName || curLeg.line),
        incomingColor: curLeg.color || curLeg.lineColor || '#facc15',
        outgoingLine: shortLineName(nextLeg.rawLineName || nextLeg.line),
        outgoingColor: nextLeg.color || nextLeg.lineColor || '#3b82f6',
        platform: i + 2,
        transferWalkingMins: nextLeg.durationMins ? Math.min(nextLeg.durationMins, 4) : 3,
      };
    }
  }

  // 2. Check origin
  const firstTransit = transitLegs[0];
  if (firstTransit && isStationMatch(firstTransit.fromStation, stationName)) {
    return {
      role: 'origin',
      candidateLabel: selectedCandidate.label || 'Selected Route',
      outgoingLine: shortLineName(firstTransit.rawLineName || firstTransit.line),
      outgoingColor: firstTransit.color || firstTransit.lineColor || '#10b981',
      platform: 1,
    };
  }

  // 3. Check destination
  const lastTransit = transitLegs[transitLegs.length - 1];
  if (lastTransit && isStationMatch(lastTransit.toStation, stationName)) {
    return {
      role: 'destination',
      candidateLabel: selectedCandidate.label || 'Selected Route',
      incomingLine: shortLineName(lastTransit.rawLineName || lastTransit.line),
      incomingColor: lastTransit.color || lastTransit.lineColor || '#ef4444',
      destination: lastTransit.toStation,
    };
  }

  // 4. Check direct pass-through / direct run
  // If candidate has 0 transfers or station is an intermediate through station
  const isDirectCandidate = selectedCandidate.interchanges === 0;
  if (isDirectCandidate && transitLegs.length === 1) {
    const directLeg = transitLegs[0];
    return {
      role: 'direct_pass_through',
      candidateLabel: selectedCandidate.label || 'Direct Route',
      directLine: shortLineName(directLeg.rawLineName || directLeg.line),
      destination: directLeg.toStation || selectedCandidate.legs[selectedCandidate.legs.length - 1]?.toStation,
    };
  }

  return null;
}
