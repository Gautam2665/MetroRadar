import { Injectable } from '@nestjs/common';
import { EdgeType } from '../graph/edge.types';
import {
  DEFAULT_WEIGHTS,
  GraphEdge,
  JourneyWeights,
} from '../graph/graph.types';

export interface JourneyScore {
  score: number;          // 0-100
  totalDuration: number;  // seconds
  transfers: number;
  walkingDuration: number; // seconds
}

/**
 * ScoringService — computes a journey quality score from the Dijkstra output.
 *
 * Score formula (0–100):
 *   travelMins    = (transit + transfer duration) / 60
 *   walkMins      = walking duration / 60
 *   transferCount = number of line changes detected
 *
 *   raw = (travelMins × travelTimeWeight)
 *       + (walkMins × walkingWeight)
 *       + (transferCount × transferPenalty / 60)
 *
 *   score = max(0, 100 - raw)
 *
 * This service is stateless and pure — it can be unit tested with no mocks.
 */
@Injectable()
export class ScoringService {
  /**
   * Compute a quality score for a journey given its edges.
   * @param edges  Ordered GraphEdge[] from RoutingService
   * @param weights  Optional custom weights (defaults to DEFAULT_WEIGHTS)
   */
  score(
    edges: GraphEdge[],
    weights: JourneyWeights = DEFAULT_WEIGHTS,
  ): JourneyScore {
    let totalDuration = 0;
    let walkingDuration = 0;
    let transfers = 0;

    let currentLineId: string | undefined = undefined;

    for (const edge of edges) {
      totalDuration += edge.duration;

      if (edge.type === EdgeType.WALK) {
        walkingDuration += edge.duration;
      }

      // Detect line transfers: TRANSIT edges with a different lineId than the previous
      if (
        edge.type === EdgeType.TRANSIT &&
        edge.lineId !== undefined &&
        currentLineId !== undefined &&
        edge.lineId !== currentLineId
      ) {
        transfers++;
      }

      if (edge.type === EdgeType.TRANSIT && edge.lineId !== undefined) {
        currentLineId = edge.lineId;
      }
    }

    const travelMins = totalDuration / 60;
    const walkMins = walkingDuration / 60;
    const penaltyMins = (transfers * weights.transferPenalty) / 60;

    const raw =
      travelMins * weights.travelTimeWeight +
      walkMins * (weights.walkingWeight - weights.travelTimeWeight) + // extra penalty for walking vs transit
      penaltyMins;

    const score = Math.max(0, Math.round(100 - raw));

    return {
      score,
      totalDuration,
      transfers,
      walkingDuration,
    };
  }
}
