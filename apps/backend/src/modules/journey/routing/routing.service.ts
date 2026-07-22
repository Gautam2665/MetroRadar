import { Injectable, Logger } from '@nestjs/common';
import { EdgeType } from '../graph/edge.types';
import { GraphEdge, JourneyWeights, TransitGraph } from '../graph/graph.types';

/**
 * RoutingService — pure Dijkstra shortest-path solver.
 *
 * Input:  TransitGraph + fromStationId + toStationId + JourneyWeights
 * Output: GraphEdge[] (the ordered path from source to destination)
 *
 * This service knows nothing about display data (colors, names, GeoJSON).
 * It only works with routing primitives from graph.types.ts.
 *
 * Edge costs use a weighted score:
 *   cost = duration × weight + transferPenalty (if TRANSFER edge)
 *
 * Sprint 5: single shortest path only (Dijkstra).
 * Sprint 6+: K-shortest paths or profile-based routing can be added here.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  /**
   * Compute the shortest path between two stations using weighted Dijkstra.
   * Returns the ordered list of edges on the path, or null if no path exists.
   */
  solve(
    graph: TransitGraph,
    fromStationId: string,
    toStationId: string,
    weights: JourneyWeights,
  ): GraphEdge[] | null {
    if (fromStationId === toStationId) {
      this.logger.warn(`Routing called with identical from/to: ${fromStationId}`);
      return [];
    }

    if (!graph.nodes.has(fromStationId) || !graph.nodes.has(toStationId)) {
      this.logger.warn(
        `One or both stations not in graph: ${fromStationId} → ${toStationId}`,
      );
      return null;
    }

    // ── Dijkstra Initialization ─────────────────────────────────────────────
    // dist[stationId] = best known cost to reach this station
    const dist = new Map<string, number>();
    // prev[stationId] = { via: stationId, edge: GraphEdge } for path reconstruction
    const prev = new Map<string, { via: string; edge: GraphEdge }>();
    // Simple priority queue using a sorted array (adequate for metro-scale graphs)
    const pq: Array<{ stationId: string; cost: number }> = [];
    const visited = new Set<string>();

    for (const id of graph.nodes.keys()) {
      dist.set(id, Infinity);
    }
    dist.set(fromStationId, 0);
    pq.push({ stationId: fromStationId, cost: 0 });

    // ── Dijkstra Main Loop ──────────────────────────────────────────────────
    while (pq.length > 0) {
      // Extract minimum cost node
      pq.sort((a, b) => a.cost - b.cost);
      const { stationId: current } = pq.shift()!;

      if (visited.has(current)) continue;
      visited.add(current);

      if (current === toStationId) break; // found target

      const outgoingEdges = graph.edges.get(current) ?? [];

      for (const edge of outgoingEdges) {
        // Skip TRANSFER self-loops — they're interchange markers, not traversal edges.
        // The scorer detects line changes independently.
        if (edge.type === EdgeType.TRANSFER && edge.from === edge.to) continue;

        if (visited.has(edge.to)) continue;

        const edgeCost = this.computeEdgeCost(edge, weights);
        const newCost = (dist.get(current) ?? Infinity) + edgeCost;

        if (newCost < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, newCost);
          prev.set(edge.to, { via: current, edge });
          pq.push({ stationId: edge.to, cost: newCost });
        }
      }
    }

    // ── Path Reconstruction ─────────────────────────────────────────────────
    if (!prev.has(toStationId) && fromStationId !== toStationId) {
      this.logger.warn(
        `No path found: ${fromStationId} → ${toStationId} in system ${graph.systemCode}`,
      );
      return null;
    }

    const path: GraphEdge[] = [];
    let current = toStationId;
    while (current !== fromStationId) {
      const entry = prev.get(current);
      if (!entry) break;
      path.unshift(entry.edge);
      current = entry.via;
    }

    this.logger.log(
      `Path found: ${fromStationId} → ${toStationId}, ${path.length} edges, cost=${dist.get(toStationId)?.toFixed(0)}`,
    );
    return path;
  }

  /**
   * Compute the cost of traversing an edge for Dijkstra.
   * - TRANSIT edges: raw duration × travelTimeWeight
   * - WALK edges: raw duration × walkingWeight
   * - TRANSFER edges: duration + transferPenalty (Sprint 5: unused in graph traversal)
   */
  private computeEdgeCost(edge: GraphEdge, weights: JourneyWeights): number {
    switch (edge.type) {
      case EdgeType.TRANSIT:
        return edge.duration * weights.travelTimeWeight;
      case EdgeType.WALK:
        return edge.duration * weights.walkingWeight;
      case EdgeType.TRANSFER:
        return edge.duration + weights.transferPenalty;
      default:
        return edge.duration;
    }
  }
}
