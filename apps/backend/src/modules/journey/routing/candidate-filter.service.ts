import { Injectable, Logger } from '@nestjs/common';

/**
 * Minimal shape of a candidate needed for filtering.
 * Both filtering stages operate on pure numbers — no display data required.
 */
export interface FilterableCandidate {
  id: string;
  durationSeconds: number;
  transfers: number;
  walkingSeconds: number;
  destination?: { id: string; name?: string; code?: string };
  destFeederDistanceMeters?: number;
  lines?: string[];
}

/**
 * CandidateFilterService — two-stage filter applied after candidate enrichment.
 *
 * Stage 1 — Feasibility: remove candidates that are physically invalid.
 * Stage 2 — Dominance: remove candidates that are strictly worse than another.
 *
 * This service is stateless and pure (no DB, no graph access).
 *
 * ── Dominance Definition ──────────────────────────────────────────────────────
 *
 * Candidate B dominates Candidate A if:
 *   B.durationSeconds  ≤ A.durationSeconds   (at least as fast)
 *   B.transfers        ≤ A.transfers          (at least as few changes)
 *   B.walkingSeconds   ≤ A.walkingSeconds     (at least as little walking)
 *   AND strictly better on at least one dimension.
 *
 * Example — B does NOT dominate A:
 *   A: 40 min · 0 transfers · 800m walking
 *   B: 32 min · 2 transfers · 500m walking   ← faster AND less walking, but more transfers
 *   → Neither dominates. Both are kept (legitimate trade-off).
 *
 * Example — B DOES dominate A:
 *   A: 40 min · 0 transfers · 800m walking
 *   B: 38 min · 0 transfers · 600m walking   ← better on ALL dimensions
 *   → A is removed.
 */
@Injectable()
export class CandidateFilterService {
  private readonly logger = new Logger(CandidateFilterService.name);

  /**
   * Run all filter stages: Feasibility -> Detour -> Dominance.
   * Returns the surviving candidates.
   */
  filter<T extends FilterableCandidate>(candidates: T[]): T[] {
    const afterFeasibility = this.applyFeasibilityFilter(candidates);
    const afterDetour = this.applyDetourFilter(afterFeasibility);
    const afterDominance = this.applyDominanceFilter(afterDetour);

    this.logger.debug(
      `Filter: ${candidates.length} → ${afterFeasibility.length} (feasibility) → ${afterDetour.length} (detour) → ${afterDominance.length} (dominance)`,
    );

    return afterDominance;
  }

  // ── Stage 1: Feasibility ────────────────────────────────────────────────────

  /**
   * Remove candidates that are physically invalid or practically unreachable.
   *
   * Rules:
   * - durationSeconds must be > 0 and finite
   * - transfers must be ≤ MAX_TRANSFERS (6 — avoids algorithmic noise)
   * - durationSeconds must be ≤ MAX_DURATION_S (8 hours — removes degenerate paths)
   */
  private applyFeasibilityFilter<T extends FilterableCandidate>(
    candidates: T[],
  ): T[] {
    const MAX_TRANSFERS = 6;
    const MAX_DURATION_S = 8 * 3600; // 8 hours

    return candidates.filter((c) => {
      if (c.durationSeconds <= 0 || !isFinite(c.durationSeconds)) return false;
      if (c.transfers > MAX_TRANSFERS) return false;
      if (c.durationSeconds > MAX_DURATION_S) return false;

      // Prune routes with out-of-station street walks > 1200m between stations during interchange
      // so Candidate 2 selects metro interchanges (e.g. via Andheri West) rather than walking between stations.
      // Note: This does not apply to first-mile access or last-mile egress legs.
      const candAny = c as any;
      if (Array.isArray(candAny.legs)) {
        const hasLongStreetWalkBetweenStations = candAny.legs.some(
          (leg: any, index: number) => {
            if (index === 0 || index === candAny.legs.length - 1) {
              return false;
            }
            if (
              leg.type === 'WALK' &&
              leg.fromStationName &&
              leg.toStationName &&
              leg.fromStationName !== leg.toStationName
            ) {
              const dist =
                leg.transferDetails?.pathwayDistanceMeters ||
                Math.round((leg.durationSeconds || leg.duration || 60) * 1.2);
              return dist > 1200;
            }
            return false;
          },
        );
        if (hasLongStreetWalkBetweenStations) return false;
      }

      return true;
    });
  }

  // ── Stage 2: Detour Filter ──────────────────────────────────────────────────

  /**
   * Remove absurdly circuitous routes that take significantly longer than the fastest option
   * without providing a substantial reduction in transfers.
   *
   * Rules:
   * 1. If candidate has > transfers than fastest route, it cannot exceed the fastest
   *    duration by > 25% (and at least 6 minutes slower).
   * 2. If candidate has ≥ transfers than fastest route, it cannot exceed the fastest
   *    duration by > 35% (and at least 10 minutes slower).
   * 3. Any route taking > 40 minutes longer than the fastest route is pruned unless
   *    it is a direct 0-transfer route.
   */
  private applyDetourFilter<T extends FilterableCandidate>(
    candidates: T[],
  ): T[] {
    if (candidates.length <= 1) return candidates;

    const fastest = candidates.reduce(
      (min, c) => (c.durationSeconds < min.durationSeconds ? c : min),
      candidates[0],
    );

    return candidates.filter((c) => {
      if (c.id === fastest.id) return true;

      const durationDelta = c.durationSeconds - fastest.durationSeconds;
      const durationRatio =
        c.durationSeconds / Math.max(fastest.durationSeconds, 1);

      const destC = (c as any).destination?.id;
      const destFastest = (fastest as any).destination?.id;
      const isSameDestination = destC && destFastest && destC === destFastest;

      // Rule 1: Strictly more transfers AND slower
      if (c.transfers > fastest.transfers) {
        if (isSameDestination) {
          // If taking the commuter to the exact same station with more transfers,
          // it cannot be more than 15% slower or 300 seconds (5 mins) slower.
          if (durationRatio > 1.15 || durationDelta > 300) {
            return false;
          }
        } else {
          // If deboarding at a different station (e.g. multi-feeder locality), allow reasonable delta
          if (durationRatio > 1.6 && durationDelta > 900) {
            return false;
          }
        }
      }

      // Rule 2: Equal or more transfers AND drastically slower
      if (c.transfers >= fastest.transfers) {
        if (isSameDestination) {
          if (durationRatio > 1.35 && durationDelta > 600) {
            return false;
          }
        } else {
          if (durationRatio > 1.8 && durationDelta > 1200) {
            return false;
          }
        }
      }

      // Rule 3: Absolute excessive detour (> 40 mins slower) unless direct (0 transfers)
      if (durationDelta > 2400 && c.transfers > 0) {
        return false;
      }

      return true;
    });
  }

  // ── Stage 3: Dominance ──────────────────────────────────────────────────────

  /**
   * Remove any candidate A for which there exists a candidate B that dominates A.
   *
   * B dominates A iff:
   *   1. B is at least as good on ALL three dimensions AND strictly better on ≥1, OR
   *   2. B is strictly faster AND has fewer-or-equal transfers than A, and any walking
   *      saved by A is dwarfed by the extra travel time (trade-off dominance).
   */
  private applyDominanceFilter<T extends FilterableCandidate>(
    candidates: T[],
  ): T[] {
    const dominated = new Set<string>();

    for (let i = 0; i < candidates.length; i++) {
      for (let j = 0; j < candidates.length; j++) {
        if (i === j) continue;
        if (dominated.has(candidates[i].id)) continue;

        const a = candidates[i];
        const b = candidates[j];

        if (this.dominates(b, a)) {
          dominated.add(a.id);
        }
      }
    }

    return candidates.filter((c) => !dominated.has(c.id));
  }

  /**
   * Returns true if `b` dominates `a`.
   */
  private dominates(b: FilterableCandidate, a: FilterableCandidate): boolean {
    const destA = (a as any).destination?.id;
    const destB = (b as any).destination?.id;
    const isDifferentDestination = destA && destB && destA !== destB;

    // 1. Strict Pareto Dominance:
    // If b is at least as good on ALL dimensions and strictly better on >= 1:
    const atLeastAsGoodOnAll =
      b.durationSeconds <= a.durationSeconds &&
      b.transfers <= a.transfers &&
      b.walkingSeconds <= a.walkingSeconds;

    const strictlyBetterOnAtLeastOne =
      b.durationSeconds < a.durationSeconds ||
      b.transfers < a.transfers ||
      b.walkingSeconds < a.walkingSeconds;

    if (atLeastAsGoodOnAll && strictlyBetterOnAtLeastOne) {
      if (isDifferentDestination) {
        // If candidate 'a' represents a different transit corridor (e.g. Yellow Line vs Red Line),
        // preserve corridor diversity for multi-feeder localities unless drastically slower.
        const linesA = (a as any).lines || [];
        const linesB = (b as any).lines || [];
        const differentCorridor =
          linesA.length > 0 &&
          linesB.length > 0 &&
          !linesA.some((l: string) => linesB.includes(l));
        if (differentCorridor && a.durationSeconds - b.durationSeconds < 900) {
          return false;
        }

        const distA = (a as any).destFeederDistanceMeters ?? Infinity;
        const distB = (b as any).destFeederDistanceMeters ?? Infinity;
        // If 'a' drops the passenger closer or within comparable proximity to their destination locality, keep 'a'
        if (
          (distA < distB || Math.abs(distA - distB) < 1500) &&
          a.durationSeconds - b.durationSeconds <= 1200
        ) {
          return false;
        }
      }
      return true;
    }

    // 2. If b is strictly faster AND has strictly fewer transfers (b is superior on both primary transit metrics):
    if (b.durationSeconds < a.durationSeconds && b.transfers < a.transfers) {
      if (!isDifferentDestination) {
        // Same destination: candidate 'a' has strictly MORE transfers AND takes LONGER.
        // It is an inferior detour.
        return true;
      }

      // Different destination: check if 'a' represents a different corridor or brings user closer / comparable distance
      const linesA = (a as any).lines || [];
      const linesB = (b as any).lines || [];
      const differentCorridor =
        linesA.length > 0 &&
        linesB.length > 0 &&
        !linesA.some((l: string) => linesB.includes(l));

      const distA = (a as any).destFeederDistanceMeters ?? Infinity;
      const distB = (b as any).destFeederDistanceMeters ?? Infinity;
      if (
        (distA < distB || Math.abs(distA - distB) < 1500 || differentCorridor) &&
        a.durationSeconds - b.durationSeconds <= 1200
      ) {
        return false;
      }
      return true;
    }

    // 3. Trade-off / Subsumption Dominance for same transfers or walking trade-offs:
    if (b.durationSeconds < a.durationSeconds && b.transfers <= a.transfers) {
      const durationDelta = a.durationSeconds - b.durationSeconds;
      const walkingSavedByA = b.walkingSeconds - a.walkingSeconds;

      if (!isDifferentDestination) {
        if (durationDelta > 600) {
          if (b.transfers < a.transfers) return true;
          if (durationDelta > Math.max(600, 2.5 * walkingSavedByA)) return true;
        }
      }
    }

    return false;
  }
}
