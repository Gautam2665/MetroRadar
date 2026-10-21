"use client";

import { useState, useEffect } from "react";
import { JourneyPlannerView } from "../components/ui/JourneyPlannerView";
import { StationItem } from "../components/StationSearchInput";
import { ApiClient } from "../services/api/client";
import { StationApi } from "../services/api/station.api";

import { formatLineName, formatShortLineName } from "../utils/transitFormatter";

// ── Shared types ─────────────────────────────────────────────────────────────

export type TransferDetails = {
  complexId?: string;
  name?: string;
  durationDisplay?: string;
  instructions?: string[];
};

export type RouteLeg = {
  mode: "subway" | "walk" | "cab";
  type?: "TRANSIT" | "TRANSFER" | "WALK";
  line: string;
  shortLine?: string;
  rawLineName?: string;
  color: string;
  lineColor?: string;
  fromStation?: string;
  toStation?: string;
  towards?: string | null;
  direction?: string | null;
  platform?: string | null;
  boardingPlatform?: string | null;
  alightingPlatform?: string | null;
  platformStatus?: "KNOWN" | "USER_REPORTED" | "UNKNOWN";
  throughServiceContinuationFromPrevious?: boolean;
  doorsOpen?: "Left" | "Right" | null;
  doorSideStatus?: "KNOWN_FROM_ENGINEERING" | "UNKNOWN_SOURCE_REQUIRED";
  transferDetails?: TransferDetails | null;
  transferTitle?: string | null;
  transferSummary?: string | null;
  transferDurationText?: string | null;
  stopsCount?: number;
  hopCount?: number;
  visitedStationCount?: number;
  stopsText?: string;
  durationMins?: number;
  durationSeconds?: number;
  transferInstructions?: string[];
  realtimeEtaMins?: number;
  connectionWaitMins?: number;
  realtimeTimeStr?: string;
  delaySeconds?: number;
};

export type RouteOption = {
  id: string;
  /** Derived from candidate.attributes: "⚡ Fastest", "◎ Direct", "🔁 Fewest changes", etc. */
  label: string;
  duration: string;
  durationMins: number;
  durationSeconds: number;
  fare: string;
  smartCardFare?: string;
  distance: string;
  interchanges: number;
  walkDistance: string;
  walkMins: number;
  crowd?: "Low" | "Medium" | "High" | null;
  crowdColor?: string | null;
  boardCoach?: string | null;
  realtimeOccupancy?: { status: string; occupancyPercent?: number } | null;
  score: number;
  legs: RouteLeg[];
  /** GeoJSON for this specific candidate */
  geojson?: GeoJSON.FeatureCollection;
  /** Tradeoff vs rank-1 candidate */
  tradeoffLabel?: string;
  /** Raw attribute flags from backend */
  attributes?: {
    fastest: boolean;
    fewestTransfers: boolean;
    direct: boolean;
    leastWalking: boolean;
    accessibilityFriendly: boolean;
  };
  interchangeFriction?: {
    level: string;
    effectiveCostSeconds: number;
    frictionSeconds: number;
  };
  reasonCodes?: string[];
  humanSummary?: string;
  destinationGuidance?: string | null;
  fareBreakdown?: Array<{
    operator: string;
    operatorName: string;
    lines: string[];
    fromStation: string;
    toStation: string;
    distanceMeters: number;
    distanceKm: number;
    paperFare: number;
    smartCardFare: number;
    tariffSlab: string;
    ticketLabel: string;
  }>;
  requiresMultipleTickets?: boolean;
  stations?: Array<{ id?: string; name: string; code?: string }>;
  realtime?: {
    primaryTrain?: {
      tripId?: string;
      delaySeconds?: number;
      etaMinutes?: number;
      status?: string;
      label?: string;
    };
    followingTrain?: {
      tripId?: string;
      delaySeconds?: number;
      etaMinutes?: number;
      status?: string;
      label?: string;
    };
  };
};

// ── Type for the backend RouteCandidate shape ─────────────────────────────────

interface BackendCandidate {
  id: string;
  rank: number;
  score: number;
  origin?: { id: string; name: string; code: string; lat: number; lng: number };
  destination?: { id: string; name: string; code: string; lat: number; lng: number };
  durationSeconds: number;
  durationMinutes?: number;
  duration: number;
  inVehicleSeconds: number;
  walkingSeconds: number;
  waiting: {
    total: { seconds: number; source: string; confidence: number };
    initialWait: { seconds: number };
    transferWait: { seconds: number };
  };
  transfers: number;
  walkingDistanceMeters: number;
  smartCardFare?: number;
  legs: Array<{
    mode?: string;
    type: string;
    lineName: string | null;
    lineCode: string | null;
    lineColor: string | null;
    fromStationName: string;
    toStationName: string;
    direction?: string | null;
    towards?: string | null;
    boardingPlatform?: string | null;
    alightingPlatform?: string | null;
    platform?: string | null;
    platformStatus?: "KNOWN" | "USER_REPORTED" | "UNKNOWN";
    throughServiceContinuationFromPrevious?: boolean;
    doorsOpen?: "Left" | "Right" | null;
    doorSideStatus?: "KNOWN_FROM_ENGINEERING" | "UNKNOWN_SOURCE_REQUIRED";
    hopCount?: number;
    visitedStationCount?: number;
    stationsCount: number;
    stopsCount?: number;
    stopsText?: string;
    duration: number;
    durationSeconds?: number;
    durationMinutes?: number;
    transferDetails?: TransferDetails | null;
    transferTitle?: string | null;
    transferSummary?: string | null;
    transferDurationText?: string | null;
    transferInstructions?: string[];
    realtimeEtaMins?: number;
    connectionWaitMins?: number;
    realtimeTimeStr?: string;
    delaySeconds?: number;
  }>;
  stations: Array<{ id: string; name: string; code: string; lat: number; lng: number }>;
  geojson: GeoJSON.FeatureCollection;
  isDirect: boolean;
  lines: string[];
  fare?: number;
  fareBreakdown?: Array<{
    operator: string;
    operatorName: string;
    lines: string[];
    fromStation: string;
    toStation: string;
    distanceMeters: number;
    distanceKm: number;
    paperFare: number;
    smartCardFare: number;
    tariffSlab: string;
    ticketLabel: string;
  }>;
  requiresMultipleTickets?: boolean;
  confidence: number;
  tradeoffs: {
    durationDeltaSeconds: number;
    transferDelta: number;
    walkingDeltaMeters: number;
  };
  attributes: {
    fastest: boolean;
    fewestTransfers: boolean;
    direct: boolean;
    leastWalking: boolean;
    accessibilityFriendly: boolean;
  };
  interchangeFriction?: {
    level: string;
    effectiveCostSeconds: number;
    frictionSeconds: number;
  };
  reasonCodes?: string[];
  humanSummary?: string;
  destinationGuidance?: string | null;
  realtime?: RouteOption["realtime"];
}

// ── Label derivation from attribute flags ────────────────────────────────────

function deriveCandidateLabel(
  attrs: BackendCandidate["attributes"],
  rank: number,
): string {
  if (attrs.direct && attrs.fastest) return "⚡ Direct & Fastest";
  if (attrs.direct) return "◎ Direct";
  if (attrs.fastest) return "⚡ Fastest";
  if (attrs.fewestTransfers) return "🔁 Fewest Changes";
  if (attrs.leastWalking) return "🚶 Least Walking";
  if (attrs.accessibilityFriendly) return "♿ Accessible";
  return `Option ${rank}`;
}

function deriveTradeoffLabel(
  tradeoffs: BackendCandidate["tradeoffs"],
  rank: number,
): string | undefined {
  if (rank === 1) return undefined;
  const mins = Math.round(Math.abs(tradeoffs.durationDeltaSeconds) / 60);
  const faster = tradeoffs.durationDeltaSeconds < 0;
  const transferDiff = tradeoffs.transferDelta;

  const parts: string[] = [];
  if (mins > 0) parts.push(faster ? `${mins} min faster` : `+${mins} min`);
  if (transferDiff !== 0) {
    parts.push(transferDiff < 0 ? `${Math.abs(transferDiff)} fewer changes` : `+${transferDiff} changes`);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

// ── Map backend candidate to frontend RouteOption ────────────────────────────

function mapCandidateToRouteOption(candidate: BackendCandidate): RouteOption {
  const totalDurationMins = candidate.durationMinutes ?? Math.round(candidate.durationSeconds / 60);
  const fareDisplay = candidate.fare ? `₹${candidate.fare}` : 'N/A';
  const smartCardDisplay = candidate.smartCardFare ? `₹${candidate.smartCardFare}` : 'N/A';

  const legs: RouteLeg[] = candidate.legs.map((leg) => {
    const isWalk = leg.mode === "TRANSFER" || leg.type === "WALK" || leg.type === "TRANSFER";
    const rawLine = leg.lineName ?? leg.lineCode ?? "";
    const cleanLine = isWalk ? "Transfer" : formatLineName(rawLine);
    const shortLine = isWalk ? "Transfer" : formatShortLineName(rawLine);
    const durMins = leg.durationMinutes ?? Math.max(1, Math.round((leg.durationSeconds ?? leg.duration) / 60));
    const hopCount = leg.hopCount ?? leg.stationsCount ?? undefined;
    const towards = isWalk ? undefined : (leg.towards || undefined);
    const boardingPlatform = leg.boardingPlatform || leg.platform || null;
    const alightingPlatform = leg.alightingPlatform || null;
    const platformStatus = leg.platformStatus || (boardingPlatform ? "KNOWN" : "UNKNOWN");
    const doorSideStatus = leg.doorSideStatus || "UNKNOWN_SOURCE_REQUIRED";
    const visitedStationCount = leg.visitedStationCount ?? (hopCount ? hopCount + 1 : undefined);
    const stopsText = leg.stopsText || (hopCount ? (hopCount === 1 ? "Ride 1 stop" : `Ride ${hopCount} stops`) : undefined);

    return {
      mode: isWalk ? ("walk" as const) : ("subway" as const),
      type: (leg.type as RouteLeg["type"]) ?? (isWalk ? "WALK" : "TRANSIT"),
      line: cleanLine,
      shortLine,
      rawLineName: rawLine,
      color: isWalk ? "#00e5ff" : (leg.lineColor ?? "#00e5ff"),
      lineColor: leg.lineColor ?? "#00e5ff",
      fromStation: leg.fromStationName,
      toStation: leg.toStationName,
      towards,
      direction: leg.direction || (towards ? towards.toUpperCase() : null),
      platform: boardingPlatform,
      boardingPlatform,
      alightingPlatform,
      platformStatus,
      throughServiceContinuationFromPrevious: leg.throughServiceContinuationFromPrevious,
      doorsOpen: leg.doorsOpen || null,
      doorSideStatus,
      transferDetails: leg.transferDetails || null,
      transferTitle: leg.transferTitle || null,
      transferSummary: leg.transferSummary || null,
      transferDurationText: leg.transferDurationText || null,
      stopsCount: hopCount,
      hopCount,
      visitedStationCount,
      stopsText,
      durationMins: durMins,
      durationSeconds: leg.durationSeconds ?? leg.duration,
      transferInstructions: leg.transferInstructions || [],
      realtimeEtaMins: leg.realtimeEtaMins,
      connectionWaitMins: leg.connectionWaitMins,
      realtimeTimeStr: leg.realtimeTimeStr,
      delaySeconds: leg.delaySeconds,
    };
  });

  const totalPathwayMeters = candidate.walkingDistanceMeters ?? 0;
  const walkMins = Math.round(candidate.walkingSeconds / 60);

  // Suppress hardcoded crowd & coach callouts unless live GTFS-RT carriage data exists
  const crowd: RouteOption["crowd"] = null;
  const crowdColor: string | null = null;
  const boardCoach: string | null = null;

  const computedTotalDurationMins = legs.reduce((acc, l) => acc + (l.durationMins || 1), 0);
  const finalTotalDurationMins = Math.max(totalDurationMins, computedTotalDurationMins);

  return {
    id: candidate.id,
    label: deriveCandidateLabel(candidate.attributes, candidate.rank),
    duration: `${finalTotalDurationMins} min`,
    durationMins: finalTotalDurationMins,
    durationSeconds: candidate.durationSeconds,
    fare: fareDisplay,
    smartCardFare: smartCardDisplay,
    distance: "",
    interchanges: candidate.transfers,
    walkDistance: totalPathwayMeters > 0 ? `${totalPathwayMeters}m` : "0m",
    walkMins,
    crowd,
    crowdColor,
    boardCoach,
    realtimeOccupancy: null,
    score: candidate.score,
    legs,
    geojson: candidate.geojson,
    tradeoffLabel: deriveTradeoffLabel(candidate.tradeoffs, candidate.rank),
    attributes: candidate.attributes,
    interchangeFriction: candidate.interchangeFriction,
    reasonCodes: candidate.reasonCodes,
    humanSummary: candidate.humanSummary,
    destinationGuidance: candidate.destinationGuidance || null,
    fareBreakdown: candidate.fareBreakdown,
    requiresMultipleTickets: candidate.requiresMultipleTickets,
    stations: candidate.stations || [],
    realtime: candidate.realtime,
  };
}

// ── Build routes from the new candidates[] response ──────────────────────────

function buildRoutesFromBackend(data: Record<string, unknown>): {
  routes: RouteOption[];
  geojsons: GeoJSON.FeatureCollection[];
} {
  const candidates = data?.candidates as BackendCandidate[] | undefined;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { routes: [], geojsons: [] };
  }

  const routes = candidates.map(mapCandidateToRouteOption);
  const geojsons = candidates.map((c) => c.geojson);
  return { routes, geojsons };
}

// ── Combine all candidate GeoJSONs to show all K routes simultaneously ───────

export function combineCandidateGeojsons(
  geojsons: GeoJSON.FeatureCollection[]
): GeoJSON.FeatureCollection {
  const lineFeatures: GeoJSON.Feature[] = [];
  const pointFeatures: GeoJSON.Feature[] = [];
  const seenLineKeys = new Set<string>();
  const seenPointKeys = new Set<string>();

  for (const gj of geojsons) {
    if (!gj || !Array.isArray(gj.features)) continue;
    for (const f of gj.features) {
      if (f.geometry.type === "LineString") {
        const coords = f.geometry.coordinates as [number, number][];
        const key = `${f.properties?.color || ""}_${coords[0]?.join(",")}_${coords[coords.length - 1]?.join(",")}`;
        if (!seenLineKeys.has(key)) {
          seenLineKeys.add(key);
          lineFeatures.push(f);
        }
      } else if (f.geometry.type === "Point") {
        const coords = f.geometry.coordinates as [number, number];
        const ptType = f.properties?.featureType || "point";
        const key = `${ptType}_${coords[0]?.toFixed(5)}_${coords[1]?.toFixed(5)}`;
        if (!seenPointKeys.has(key)) {
          seenPointKeys.add(key);
          pointFeatures.push(f);
        }
      }
    }
  }

  return {
    type: "FeatureCollection",
    features: [...lineFeatures, ...pointFeatures],
  };
}

// ── Container ─────────────────────────────────────────────────────────────────

interface Props {
  activeCity: string;
  onGeojsonUpdate?: (geojson: GeoJSON.FeatureCollection | Record<string, unknown>) => void;
  onRouteFound?: (route: RouteOption, originName: string, destName: string) => void;
  onActiveRouteChange?: (route: RouteOption | null) => void;
  onCandidatesChange?: (candidates: RouteOption[]) => void;
  selectedOriginStation?: { id: string; name: string } | null;
  selectedDestStation?: { id: string; name: string } | null;
}

export function JourneyPlannerContainer({
  activeCity,
  onGeojsonUpdate,
  onRouteFound,
  onActiveRouteChange,
  onCandidatesChange,
  selectedOriginStation,
  selectedDestStation,
}: Props) {
  const [originName, setOriginName] = useState("");
  const [destName, setDestName] = useState("");
  const [originId, setOriginId] = useState<string | null>(null);
  const [destId, setDestId] = useState<string | null>(null);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  /** All candidate GeoJSONs — one per route, indexed to match routes[] */
  const [geojsons, setGeojsons] = useState<GeoJSON.FeatureCollection[]>([]);

  useEffect(() => {
    if (selectedOriginStation) {
      const timer = setTimeout(() => {
        setOriginName(selectedOriginStation.name);
        setOriginId(selectedOriginStation.id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedOriginStation]);

  useEffect(() => {
    if (selectedDestStation) {
      const timer = setTimeout(() => {
        setDestName(selectedDestStation.name);
        setDestId(selectedDestStation.id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedDestStation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOriginName("");
      setDestName("");
      setOriginId(null);
      setDestId(null);
      setRoutes([]);
      setGeojsons([]);
      setActiveRouteIndex(null);
      setError(null);
      onActiveRouteChange?.(null);
      onCandidatesChange?.([]);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeCity, onActiveRouteChange, onCandidatesChange]);

  const handleSelectOrigin = (station: StationItem) => {
    setOriginName(station.name);
    setOriginId(station.id);
  };

  const handleSelectDest = (station: StationItem) => {
    setDestName(station.name);
    setDestId(station.id);
  };

  const handleSwap = () => {
    setOriginName(destName);
    setDestName(originName);
    setOriginId(destId);
    setDestId(originId);
  };

  /** Called when the user clicks a route card — focus map on that route or toggle back to all K routes */
  const handleRouteSelect = (index: number) => {
    // If clicking already selected route, toggle to deselected state & restore all K routes on map
    if (activeRouteIndex === index) {
      setActiveRouteIndex(null);
      onActiveRouteChange?.(null);
      const combined = combineCandidateGeojsons(geojsons);
      if (onGeojsonUpdate) {
        onGeojsonUpdate(combined);
      }
      return;
    }

    setActiveRouteIndex(index);
    const selectedGeojson = geojsons[index];
    if (selectedGeojson && onGeojsonUpdate) {
      onGeojsonUpdate(selectedGeojson);
    }
    if (routes[index]) {
      onActiveRouteChange?.(routes[index]);
      if (onRouteFound) {
        onRouteFound(routes[index], originName, destName);
      }
    }
  };

  const handleQuickPillSelect = async (pill: string) => {
    // If origin is empty, assign to origin; otherwise assign to destination
    const assignToOrigin = !originId || (originName === "" && destName !== "");
    if (assignToOrigin) {
      setOriginName(pill);
      setOriginId(null);
    } else {
      setDestName(pill);
      setDestId(null);
    }

    const res = await StationApi.searchStations(pill, activeCity);
    if (res.success && res.data.length > 0) {
      const match =
        res.data.find((s) => s.name.toLowerCase().includes(pill.toLowerCase())) || res.data[0];
      if (assignToOrigin) {
        setOriginName(match.name);
        setOriginId(match.id);
      } else {
        setDestName(match.name);
        setDestId(match.id);
      }
    }
  };

  const handlePlanJourney = async () => {
    let resolvedOriginId = originId;
    let resolvedDestId = destId;

    if (!resolvedOriginId && originName.trim()) {
      const res = await StationApi.searchStations(originName.trim(), activeCity);
      if (res.success && res.data.length > 0) {
        resolvedOriginId = res.data[0].id;
        setOriginId(resolvedOriginId);
        setOriginName(res.data[0].name);
      }
    }

    if (!resolvedDestId && destName.trim()) {
      const res = await StationApi.searchStations(destName.trim(), activeCity);
      if (res.success && res.data.length > 0) {
        resolvedDestId = res.data[0].id;
        setDestId(resolvedDestId);
        setDestName(res.data[0].name);
      }
    }

    if (!resolvedOriginId || !resolvedDestId) {
      setError("Please select stations from the dropdown or quick suggestions.");
      return;
    }
    if (resolvedOriginId === resolvedDestId) {
      setError("Origin and destination must be different.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await ApiClient.get<Record<string, unknown>>(
      `/journeys?from=${encodeURIComponent(resolvedOriginId)}&to=${encodeURIComponent(resolvedDestId)}&k=5`
    );

    if (res.success && res.data && typeof res.data === "object" && "candidates" in res.data) {
      const { routes: builtRoutes, geojsons: builtGeojsons } = buildRoutesFromBackend(res.data);

      if (builtRoutes.length > 0) {
        setRoutes(builtRoutes);
        setGeojsons(builtGeojsons);
        // By default: keep all card routes deselected & hide details
        setActiveRouteIndex(null);
        onActiveRouteChange?.(null);
        onCandidatesChange?.(builtRoutes);

        // Show all K fetched routes on the map simultaneously
        const combined = combineCandidateGeojsons(builtGeojsons);
        if (onGeojsonUpdate) {
          onGeojsonUpdate(combined);
        }
      } else {
        setError("No route found.");
        setRoutes([]);
        setGeojsons([]);
        setActiveRouteIndex(null);
        onActiveRouteChange?.(null);
        onCandidatesChange?.([]);
      }
    } else {
      setError(res.success ? "No route found." : res.error);
      setRoutes([]);
      setGeojsons([]);
      setActiveRouteIndex(null);
      onActiveRouteChange?.(null);
      onCandidatesChange?.([]);
    }

    setLoading(false);
  };

  return (
    <JourneyPlannerView
      activeCity={activeCity}
      origin={originName}
      destination={destName}
      originId={originId}
      destinationId={destId}
      activeRouteIndex={activeRouteIndex}
      routes={routes}
      loading={loading}
      error={error}
      onOriginChange={(val) => { setOriginName(val); setOriginId(null); }}
      onDestinationChange={(val) => { setDestName(val); setDestId(null); }}
      onSelectOriginStation={handleSelectOrigin}
      onSelectDestinationStation={handleSelectDest}
      onSwap={handleSwap}
      onRouteSelect={handleRouteSelect}
      onSearchRoute={handlePlanJourney}
      onQuickPillSelect={handleQuickPillSelect}
    />
  );
}
