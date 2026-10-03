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
   * Run both filter stages. Returns the surviving candidates.
   * Input order is not preserved — caller should re-rank afterwards.
   */
  filter<T extends FilterableCandidate>(candidates: T[]): T[] {
    const afterFeasibility = this.applyFeasibilityFilter(candidates);
    const afterDominance = this.applyDominanceFilter(afterFeasibility);

    this.logger.debug(
      `Filter: ${candidates.length} → ${afterFeasibility.length} (feasibility) → ${afterDominance.length} (dominance)`,
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
      return true;
    });
  }

  // ── Stage 2: Dominance ──────────────────────────────────────────────────────

  /**
   * Remove any candidate A for which there exists a candidate B that dominates A.
   *
   * B dominates A iff:
   *   B is at least as good on ALL three dimensions AND strictly better on ≥1.
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
   * Returns true if `b` strictly dominates `a`.
   */
  private dominates(b: FilterableCandidate, a: FilterableCandidate): boolean {
    const atLeastAsGoodOnAll =
      b.durationSeconds <= a.durationSeconds &&
      b.transfers <= a.transfers &&
      b.walkingSeconds <= a.walkingSeconds;

    const strictlyBetterOnAtLeastOne =
      b.durationSeconds < a.durationSeconds ||
      b.transfers < a.transfers ||
      b.walkingSeconds < a.walkingSeconds;

    return atLeastAsGoodOnAll && strictlyBetterOnAtLeastOne;
  }
}
