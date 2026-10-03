import { Injectable } from '@nestjs/common';
import { EdgeType } from '../graph/edge.types';
import {
  DEFAULT_WEIGHTS,
  GraphEdge,
  JourneyWeights,
} from '../graph/graph.types';
import { CandidateAttributes, CandidateTradeoffs } from './candidate.types';

export interface JourneyScore {
  score: number; // 0-100
  totalDuration: number; // seconds (in-vehicle + walking only — excludes waiting)
  inVehicleSeconds: number;
  walkingSeconds: number;
  transfers: number;
}

/**
 * ScoringService — computes journey quality scores and candidate metadata.
 *
 * ── Score Formula (0–100) ────────────────────────────────────────────────────
 *
 *   travelMins  = (inVehicle + walking) / 60
 *   walkMins    = walking / 60
 *   penaltyMins = (transfers × transferPenalty) / 60
 *
 *   raw = (travelMins × travelTimeWeight)
 *       + (walkMins × (walkingWeight - travelTimeWeight))  ← extra walking penalty
 *       + penaltyMins
 *
 *   score = max(0, 100 - raw)
 *
 * ── Attribute Flags ──────────────────────────────────────────────────────────
 *
 * computeAttributes() is called once after all candidates have been enriched.
 * It compares candidates against each other to assign boolean flags
 * (fastest, fewestTransfers, direct, leastWalking, accessibilityFriendly).
 *
 * ── Ranking ──────────────────────────────────────────────────────────────────
 *
 * Default rank formula (lower = better):
 *   rankScore = durationSeconds × 0.6 + transfers × 120 + walkingSeconds × 0.2
 *
 * This is a display-ranking heuristic only — it does NOT affect graph routing.
 * The Intent engine may override these weights without re-routing.
 *
 * This service is stateless and pure — it can be unit tested with no mocks.
 */
@Injectable()
export class ScoringService {
  /**
   * Compute quality score and timing breakdown for a single path.
   * Does NOT include waiting time — that is computed separately.
   */
  score(
    edges: GraphEdge[],
    weights: JourneyWeights = DEFAULT_WEIGHTS,
  ): JourneyScore {
    let inVehicleSeconds = 0;
    let walkingSeconds = 0;
    let transfers = 0;

    let currentLineId: string | undefined = undefined;

    for (const edge of edges) {
      if (edge.type === EdgeType.TRANSIT) {
        inVehicleSeconds += edge.duration;
      } else if (edge.type === EdgeType.WALK) {
        walkingSeconds += edge.duration;
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

    const totalDuration = inVehicleSeconds + walkingSeconds;
    const travelMins = totalDuration / 60;
    const walkMins = walkingSeconds / 60;
    const penaltyMins = (transfers * weights.transferPenalty) / 60;

    const raw =
      travelMins * weights.travelTimeWeight +
      walkMins * (weights.walkingWeight - weights.travelTimeWeight) +
      penaltyMins;

    const score = Math.max(0, Math.round(100 - raw));

    return {
      score,
      totalDuration,
      inVehicleSeconds,
      walkingSeconds,
      transfers,
    };
  }

  /**
   * Compute the default ranking score for a candidate.
   * Lower is better.
   *
   * Formula: durationSeconds × 0.6 + transfers × 120 + walkingSeconds × 0.2
   *
   * This is a display heuristic — it does not affect which paths are generated.
   */
  rankScore(
    durationSeconds: number,
    transfers: number,
    walkingSeconds: number,
  ): number {
    return durationSeconds * 0.6 + transfers * 120 + walkingSeconds * 0.2;
  }

  /**
   * Assign attribute flags to each candidate by comparing across the full set.
   * Modifies the attributes field in-place.
   *
   * @param candidates  Array of objects with durationSeconds, transfers, walkingSeconds, isDirect
   */
  computeAttributes<
    T extends {
      durationSeconds: number;
      transfers: number;
      walkingSeconds: number;
      isDirect: boolean;
      attributes: CandidateAttributes;
    },
  >(candidates: T[]): void {
    if (candidates.length === 0) return;

    const minDuration = Math.min(...candidates.map((c) => c.durationSeconds));
    const minTransfers = Math.min(...candidates.map((c) => c.transfers));
    const minWalking = Math.min(...candidates.map((c) => c.walkingSeconds));

    for (const c of candidates) {
      c.attributes.fastest = c.durationSeconds === minDuration;
      c.attributes.fewestTransfers = c.transfers === minTransfers;
      c.attributes.direct = c.isDirect;
      c.attributes.leastWalking = c.walkingSeconds === minWalking;
      // v1 stub: accessible = direct route (no platform changes)
      // Future: query accessibility data per station
      c.attributes.accessibilityFriendly = c.isDirect;
    }
  }

  /**
   * Compute trade-off deltas for each candidate relative to the rank-1 candidate.
   *
   * @param candidates  All candidates, already sorted by rank (index 0 = rank 1)
   */
  computeTradeoffs<
    T extends {
      durationSeconds: number;
      transfers: number;
      walkingSeconds: number;
      tradeoffs: CandidateTradeoffs;
    },
  >(candidates: T[]): void {
    if (candidates.length === 0) return;
    const rank1 = candidates[0];

    for (const c of candidates) {
      c.tradeoffs = {
        durationDeltaSeconds: c.durationSeconds - rank1.durationSeconds,
        transferDelta: c.transfers - rank1.transfers,
        walkingDeltaMeters: 0, // v1 stub — no real walking distance yet
      };
    }
  }
}
