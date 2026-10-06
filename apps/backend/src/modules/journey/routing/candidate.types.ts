import { EdgeType } from '../graph/edge.types';

// ── Time Estimate ─────────────────────────────────────────────────────────────

/**
 * A time value with its data source and confidence level.
 * Allows the waiting time model to evolve from estimated → scheduled → live
 * without changing the RouteCandidate contract.
 */
export interface TimeEstimate {
  seconds: number;
  /** Where this estimate comes from */
  source: 'live' | 'schedule' | 'estimated';
  /** 0–1. Live = 0.9, scheduled = 0.7, estimated fallback = 0.3 */
  confidence: number;
}

// ── Waiting Breakdown ─────────────────────────────────────────────────────────

/**
 * Waiting time broken into initial platform wait and interchange waits.
 *
 * v1 (current): all values are estimated fallbacks.
 *
 * Future (timetable available):
 *   initialWait.seconds = nextDeparture − requestedDepartureTime
 *   transferWait.seconds = sum of (nextConnectingDeparture − arrivalAtStation)
 *
 * Future (realtime available):
 *   source → 'live', confidence → 0.9
 */
export interface WaitingBreakdown {
  /** Sum of initialWait + transferWait */
  total: TimeEstimate;
  /** Wait at origin station for the first train */
  initialWait: TimeEstimate;
  /** Aggregate wait at interchange stations */
  transferWait: TimeEstimate;
}

// ── Candidate Attribute Flags ─────────────────────────────────────────────────

/**
 * Machine-readable boolean characteristics of a RouteCandidate.
 * Derived from comparing all candidates in the result set — not stored in the graph.
 * The UI derives display badges from these flags.
 *
 * - fastest          → ⚡ Fastest
 * - direct           → ◎ Direct
 * - fewestTransfers  → 🔁 Fewest changes
 * - leastWalking     → 🚶 Least walking
 * - accessibilityFriendly → ♿ Accessible (v1 stub: true when transfers === 0)
 */
export interface CandidateAttributes {
  fastest: boolean;
  fewestTransfers: boolean;
  direct: boolean;
  leastWalking: boolean;
  accessibilityFriendly: boolean;
}

// ── Tradeoffs ─────────────────────────────────────────────────────────────────

/**
 * How this candidate compares to the rank-1 candidate.
 * Negative durationDeltaSeconds means this candidate is FASTER than rank-1.
 */
export interface CandidateTradeoffs {
  durationDeltaSeconds: number;
  transferDelta: number;
  walkingDeltaMeters: number;
}

// ── Station Reference ─────────────────────────────────────────────────────────

export interface StationRef {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
}

// ── Transfer Details ─────────────────────────────────────────────────────────

export interface TransferComponents {
  verticalEgressSeconds: number;
  afcExitSeconds: number;
  streetWalkSeconds: number;
  securityScreeningSeconds: number;
  afcEntrySeconds: number;
  platformAscentSeconds: number;
}

export interface TransferAttributes {
  paidAreaTransfer: boolean;
  requiresAfcRetap: boolean;
  requiresSecurityRescreening: boolean;
  outdoorStreetExposure: boolean;
  verticalDropMeters: number;
}

export interface TransferDetails {
  complexId: string;
  name: string;
  pathwayDistanceMeters: number | null;
  estimatedDurationSeconds: number | null;
  durationDisplay: string;
  components?: TransferComponents;
  attributes: Partial<TransferAttributes>;
  pathway?: Array<{
    segmentId?: string;
    from: string;
    to: string;
    type: string;
    distanceMeters?: number | null;
    structureLengthMeters?: number | null;
    sourceState?: string;
  }>;
  reasonCodes: string[];
  instructions: string[];
}

// ── Journey Leg ───────────────────────────────────────────────────────────────

export type LegMode = 'METRO' | 'TRANSFER';
export type DoorSide = 'Left' | 'Right' | null;
export type DoorSideStatus = 'KNOWN_FROM_ENGINEERING' | 'UNKNOWN_SOURCE_REQUIRED';
export type PlatformStatus = 'KNOWN' | 'USER_REPORTED' | 'UNKNOWN';

export interface JourneyLeg {
  id?: string;
  mode: LegMode;
  from: string;
  fromStationName: string;
  fromStation?: StationRef;
  to: string;
  toStationName: string;
  toStation?: StationRef;
  type: EdgeType;
  duration: number;
  durationSeconds: number;
  durationMinutes: number;
  lineId: string | null;
  lineName: string | null;
  lineColor: string | null;
  lineCode: string | null;
  /** Explicit number of inter-station train hops (intermediate segments) */
  hopCount: number;
  /** Total station nodes touched (origin + intermediate + destination) */
  visitedStationCount: number;
  /** Legacy alias for hopCount */
  stationsCount: number;
  stopsCount: number;
  /** Passenger-facing string strictly computed by TransitOS: "Ride N stops" */
  stopsText: string;
  direction?: string | null;
  towards?: string | null;
  boardingPlatform?: string | null;
  alightingPlatform?: string | null;
  platform?: string | null;
  platformStatus?: PlatformStatus;
  /** This leg continues the same train service across a corridor-ID boundary. */
  throughServiceContinuationFromPrevious?: boolean;
  doorsOpen?: DoorSide;
  doorSideStatus?: DoorSideStatus;
  transferDetails?: TransferDetails | null;
  transferTitle?: string | null;
  transferSummary?: string | null;
  transferDurationText?: string | null;
  transferInstructions?: string[];
}

// ── Route Candidate ───────────────────────────────────────────────────────────

/**
 * A single candidate journey returned by the Journey Engine.
 *
 * The engine generates K candidates via Yen's K-shortest paths,
 * filters dominated routes, then ranks survivors. Each candidate
 * is enriched with timing breakdown, attribute flags, and tradeoff
 * metadata so the Intent engine (future sprint) can re-rank without
 * re-running the graph algorithm.
 */
export interface RouteCandidate {
  /** Stable identifier for this candidate (hash of edge sequence) */
  id: string;

  /** 1 = best by default ranking */
  rank: number;

  /** 0–100 composite quality score */
  score: number;

  /** Explicit journey endpoints */
  origin: StationRef;
  destination: StationRef;

  // ── Timing ──────────────────────────────────────────────────────────────

  /** Total journey time including in-vehicle + walking + waiting */
  durationSeconds: number;
  durationMinutes: number;
  /** Convenience field: durationSeconds / 60 (rounded) */
  duration: number;

  /** Time aboard trains only */
  inVehicleSeconds: number;

  /** Walking leg duration (seconds) */
  walkingSeconds: number;

  /** Structured waiting time breakdown */
  waiting: WaitingBreakdown;

  // ── Complexity ───────────────────────────────────────────────────────────

  /** Number of line changes (0 = direct) */
  transfers: number;

  /** Estimated total walking distance in meters */
  walkingDistanceMeters: number;

  // ── Route Detail ─────────────────────────────────────────────────────────

  legs: JourneyLeg[];
  stations: StationRef[];
  geojson: GeoJSON.FeatureCollection;

  // ── Characteristics ──────────────────────────────────────────────────────

  /** true when transfers === 0 */
  isDirect: boolean;

  /** Display names of lines used, in order of travel */
  lines: string[];

  // ── Operational Metadata (v1 stubs, filled by future sprints) ────────────

  /** Estimated fare in INR. undefined until fare data is ingested */
  fare?: number;

  /**
   * 0–1 confidence that this route is operational right now.
   * v1: 0.8 (heuristic). Future: derived from realtime feed health + schedule currency.
   */
  confidence: number;

  // ── Comparison vs rank-1 ─────────────────────────────────────────────────

  tradeoffs: CandidateTradeoffs;

  // ── Machine-readable attribute flags ────────────────────────────────────

  attributes: CandidateAttributes;

  // ── Interchange Intelligence & Reason Codes (Sprint v0.6.5-K) ───────────

  interchangeFriction?: {
    level: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    effectiveCostSeconds: number;
    frictionSeconds: number;
  };

  reasonCodes?: string[];

  humanSummary?: string;

  destinationGuidance?: string | null;
}

// ── Journey Response ─────────────────────────────────────────────────────────

export interface JourneyResponseMetadata {
  generatedAt: string;
  algorithm: 'yen-k-shortest';
  graphVersion: string;
  candidateCount: number;
  from: StationRef;
  to: StationRef;
}

export interface JourneyResponse {
  metadata: JourneyResponseMetadata;
  candidates: RouteCandidate[];
}

// ── Waiting Time Estimation ───────────────────────────────────────────────────

const INITIAL_WAIT_S = 120; // 2 min — wait for first train at origin
const TRANSFER_WAIT_S = 120; // 2 min per interchange — wait for connecting train

/**
 * Estimate waiting time for a journey.
 *
 * v1: fallback estimates only.
 * Future sprints will resolve against scheduled headways then live departure boards.
 *
 * @param transfers Number of line changes in the journey
 */
export function estimateWaiting(transfers: number): WaitingBreakdown {
  return {
    total: {
      seconds: INITIAL_WAIT_S + transfers * TRANSFER_WAIT_S,
      source: 'estimated',
      confidence: 0.3,
    },
    initialWait: {
      seconds: INITIAL_WAIT_S,
      source: 'estimated',
      confidence: 0.3,
    },
    transferWait: {
      seconds: transfers * TRANSFER_WAIT_S,
      source: 'estimated',
      confidence: 0.3,
    },
  };
}

/**
 * Generate a stable ID for a candidate from its edge sequence.
 * Used as a cache/deduplication key.
 */
export function candidateId(
  edges: { from: string; to: string; lineId?: string }[],
): string {
  return edges.map((e) => `${e.from}>${e.to}:${e.lineId ?? '-'}`).join('|');
}
