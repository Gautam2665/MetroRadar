import { EdgeType } from './edge.types';

/** A node in the transit graph — station-level only, no platforms */
export interface StationNode {
  id: string;
  code: string;
  name: string;
  systemId: string;
  lineIds: string[];
  lat: number;
  lng: number;
}

/**
 * A directed edge in the transit graph.
 * PURE routing data only — no display fields (no lineColor, lineName, stationName).
 * Enrichment with display data happens after Dijkstra in the response mapper.
 */
export interface GraphEdge {
  from: string;   // stationId
  to: string;     // stationId
  type: EdgeType;
  duration: number; // seconds
  lineId?: string;  // populated for TRANSIT edges only
}

/** Adjacency list representation of the transit graph for one system */
export interface TransitGraph {
  systemId: string;
  systemCode: string;
  nodes: Map<string, StationNode>;       // stationId → StationNode
  edges: Map<string, GraphEdge[]>;       // stationId → outgoing edges
  builtAt: number;                       // unix timestamp for TTL tracking
}

/** Configurable weights for journey scoring — allows profile-based routing in future sprints */
export interface JourneyWeights {
  travelTimeWeight: number;   // multiplier on transit minutes
  walkingWeight: number;      // multiplier on walking minutes
  transferPenalty: number;    // seconds deducted per line transfer
}

export const DEFAULT_WEIGHTS: JourneyWeights = {
  travelTimeWeight: 1.0,
  walkingWeight: 1.5,
  transferPenalty: 600, // 10 minutes per transfer
};
