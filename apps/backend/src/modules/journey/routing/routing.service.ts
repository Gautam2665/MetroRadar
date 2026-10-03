import { Injectable, Logger } from '@nestjs/common';
import { EdgeType } from '../graph/edge.types';
import { GraphEdge, JourneyWeights, TransitGraph } from '../graph/graph.types';

/**
 * RoutingService — Multi-profile candidate generation & Yen's loopless path solver.
 *
 * Primary method: solveKShortest()
 *   Generates distinct candidate journeys across key transit objectives:
 *     1. Fastest / Balanced (normal transfer penalty)
 *     2. Fewest Transfers / Direct (high transfer penalty)
 *     3. Alternative Corridors (Yen's spur search excluding station-pair transitions)
 *
 * State-aware Dijkstra:
 *   State is (stationId, lineId). When transitioning from one line to another,
 *   transferPenalty is actively applied during Dijkstra cost calculation.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Backward-compatible single-path solver.
   * Equivalent to solveKShortest(..., k=1)[0].
   */
  solve(
    graph: TransitGraph,
    fromStationId: string,
    toStationId: string,
    weights: JourneyWeights,
  ): GraphEdge[] | null {
    if (fromStationId === toStationId) {
      this.logger.warn(
        `Routing called with identical from/to: ${fromStationId}`,
      );
      return [];
    }
    const results = this.solveKShortest(
      graph,
      fromStationId,
      toStationId,
      weights,
      1,
    );
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Multi-objective candidate generation:
   * Returns up to `k` distinct, loopless candidate paths.
   */
  solveKShortest(
    graph: TransitGraph,
    fromStationId: string,
    toStationId: string,
    weights: JourneyWeights,
    k: number,
  ): GraphEdge[][] {
    if (fromStationId === toStationId) {
      this.logger.warn(
        `Routing called with identical from/to: ${fromStationId}`,
      );
      return [];
    }

    if (!graph.nodes.has(fromStationId) || !graph.nodes.has(toStationId)) {
      this.logger.warn(
        `One or both stations not in graph: ${fromStationId} → ${toStationId}`,
      );
      return [];
    }

    const candidates: GraphEdge[][] = [];
    const stationSignatures = new Set<string>();

    const addCandidate = (path: GraphEdge[] | null) => {
      if (!path || path.length === 0) return false;
      const sig = this.pathStationSignature(path);
      if (!stationSignatures.has(sig)) {
        stationSignatures.add(sig);
        candidates.push(path);
        return true;
      }
      return false;
    };

    // ── Objective 1: Balanced / Fastest ─────────────────────────────────────
    const fastestPath = this.dijkstraStateAware(
      graph,
      fromStationId,
      toStationId,
      weights,
      weights.transferPenalty,
      new Set(),
      new Set(),
    );
    addCandidate(fastestPath);

    if (k > 1) {
      // ── Objective 2: Fewest Transfers / Direct (High transfer penalty) ────
      const directPath = this.dijkstraStateAware(
        graph,
        fromStationId,
        toStationId,
        weights,
        Math.max(weights.transferPenalty * 6, 1200), // 20 min transfer penalty
        new Set(),
        new Set(),
      );
      addCandidate(directPath);

      // ── Objective 3+: Yen's Spur Search for Alternative Corridors ─────────
      const seedPaths = [...candidates];
      for (const base of seedPaths) {
        if (candidates.length >= k) break;

        for (let i = 0; i < Math.min(base.length - 1, 8); i++) {
          const spurNodeId = base[i].from;
          const rootPath = base.slice(0, i);

          // Exclude station-to-station corridor used by base at this spur
          const excludedStationPairs = new Set<string>();
          excludedStationPairs.add(`${base[i].from}->${base[i].to}`);

          // Exclude visited stations in root path to ensure loopless
          const excludedNodes = new Set<string>(rootPath.map((e) => e.from));

          // Run spur search with initial lineId of root path's last edge
          const initialLineId =
            rootPath.length > 0
              ? rootPath[rootPath.length - 1].lineId
              : undefined;

          const spurPath = this.dijkstraStateAware(
            graph,
            spurNodeId,
            toStationId,
            weights,
            weights.transferPenalty,
            excludedNodes,
            excludedStationPairs,
            initialLineId,
          );

          if (spurPath) {
            const fullPath = [...rootPath, ...spurPath];
            if (addCandidate(fullPath)) {
              if (candidates.length >= k) break;
            }
          }
        }
      }
    }

    this.logger.log(
      `Candidate search: ${fromStationId} → ${toStationId}, generated ${candidates.length}/${k} candidates`,
    );

    return candidates.slice(0, k);
  }

  // ── Private: State-Aware Dijkstra ──────────────────────────────────────────

  /**
   * State-aware Dijkstra:
   * State is `stationId:lineId`. Tracks line transitions and applies `transferPenalty`
   * when moving between edges with different `lineId`s.
   *
   * @param excludedNodes  Station IDs that must not be visited (loopless enforcement)
   * @param excludedStationPairs Station-pair strings `fromId->toId` that must not be crossed
   * @param initialLineId Starting line ID if part of a spur path
   */
  private dijkstraStateAware(
    graph: TransitGraph,
    fromStationId: string,
    toStationId: string,
    weights: JourneyWeights,
    transferPenalty: number,
    excludedNodes: Set<string>,
    excludedStationPairs: Set<string>,
    initialLineId?: string,
  ): GraphEdge[] | null {
    const dist = new Map<string, number>();
    const prev = new Map<string, { viaKey: string; edge: GraphEdge }>();
    const pq: Array<{
      stateKey: string;
      stationId: string;
      lineId: string | undefined;
      cost: number;
    }> = [];
    const visited = new Set<string>();

    const startKey = `${fromStationId}:${initialLineId ?? 'START'}`;
    dist.set(startKey, 0);
    pq.push({
      stateKey: startKey,
      stationId: fromStationId,
      lineId: initialLineId,
      cost: 0,
    });

    let bestDestKey: string | null = null;
    let minDestCost = Infinity;

    while (pq.length > 0) {
      pq.sort((a, b) => a.cost - b.cost);
      const curr = pq.shift()!;

      if (visited.has(curr.stateKey)) continue;
      visited.add(curr.stateKey);

      if (curr.stationId === toStationId) {
        if (curr.cost < minDestCost) {
          minDestCost = curr.cost;
          bestDestKey = curr.stateKey;
        }
        break;
      }

      const outgoing = graph.edges.get(curr.stationId) ?? [];
      for (const edge of outgoing) {
        if (edge.type === EdgeType.TRANSFER && edge.from === edge.to) continue;
        if (excludedNodes.has(edge.to)) continue;
        if (excludedStationPairs.has(`${edge.from}->${edge.to}`)) continue;

        let edgeCost = edge.duration * weights.travelTimeWeight;
        if (edge.type === EdgeType.WALK) {
          edgeCost = edge.duration * weights.walkingWeight;
        }

        // Apply transfer penalty when changing lines
        const isLineChange =
          curr.lineId !== undefined &&
          edge.lineId !== undefined &&
          curr.lineId !== edge.lineId;
        if (isLineChange) {
          edgeCost += transferPenalty;
        }

        const nextLineId = edge.lineId ?? curr.lineId;
        const nextStateKey = `${edge.to}:${nextLineId ?? 'NONE'}`;

        if (visited.has(nextStateKey)) continue;

        const newCost = curr.cost + edgeCost;
        if (newCost < (dist.get(nextStateKey) ?? Infinity)) {
          dist.set(nextStateKey, newCost);
          prev.set(nextStateKey, { viaKey: curr.stateKey, edge });
          pq.push({
            stateKey: nextStateKey,
            stationId: edge.to,
            lineId: nextLineId,
            cost: newCost,
          });
        }
      }
    }

    if (!bestDestKey) return null;

    const path: GraphEdge[] = [];
    let currKey = bestDestKey;
    while (currKey !== startKey) {
      const p = prev.get(currKey);
      if (!p) break;
      path.unshift(p.edge);
      currKey = p.viaKey;
    }
    return path;
  }

  // ── Private: Helpers ────────────────────────────────────────────────────────

  /**
   * Signature based strictly on station sequence.
   * Prevents micro-variations where only redundant parallel lineIds differ.
   */
  private pathStationSignature(path: GraphEdge[]): string {
    return path.map((e) => `${e.from}>${e.to}`).join('|');
  }
}
