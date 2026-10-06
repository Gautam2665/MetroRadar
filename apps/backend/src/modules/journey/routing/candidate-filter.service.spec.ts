import {
  CandidateFilterService,
  FilterableCandidate,
} from './candidate-filter.service';

function makeCandidate(
  id: string,
  durationSeconds: number,
  transfers: number,
  walkingSeconds: number = 0,
): FilterableCandidate {
  return { id, durationSeconds, transfers, walkingSeconds };
}

describe('CandidateFilterService', () => {
  let service: CandidateFilterService;

  beforeEach(() => {
    service = new CandidateFilterService();
  });

  // ── Feasibility filter ───────────────────────────────────────────────────────

  describe('feasibility filter', () => {
    it('removes candidate with duration = 0', () => {
      const result = service.filter([makeCandidate('A', 0, 0)]);
      expect(result).toHaveLength(0);
    });

    it('removes candidate with Infinity duration', () => {
      const result = service.filter([makeCandidate('A', Infinity, 0)]);
      expect(result).toHaveLength(0);
    });

    it('removes candidate with > 6 transfers', () => {
      const result = service.filter([makeCandidate('A', 3600, 7)]);
      expect(result).toHaveLength(0);
    });

    it('removes candidate with duration > 8 hours', () => {
      const result = service.filter([makeCandidate('A', 8 * 3600 + 1, 0)]);
      expect(result).toHaveLength(0);
    });

    it('keeps valid candidates that are not dominated', () => {
      // A: 30 min, 0 transfers — direct, slower walking: 0
      // B: 20 min, 2 transfers — faster but more changes
      // Neither dominates the other (A has fewer transfers, B is faster)
      const result = service.filter([
        makeCandidate('A', 1800, 0),
        makeCandidate('B', 1200, 2),
      ]);
      expect(result).toHaveLength(2);
    });
  });

  // ── Dominance filter ─────────────────────────────────────────────────────────

  describe('dominance filter', () => {
    it('removes dominated candidate (worse on all dimensions)', () => {
      // B is strictly better than A on all three dimensions
      const a = makeCandidate('A', 2400, 1, 600);
      const b = makeCandidate('B', 1800, 0, 300);
      const result = service.filter([a, b]);
      expect(result.map((c) => c.id)).not.toContain('A');
      expect(result.map((c) => c.id)).toContain('B');
    });

    it('keeps both when neither dominates (duration trade-off vs transfers)', () => {
      // Yamuna Bank case analog:
      // A: 40 min, 0 transfers  (direct)
      // B: 35 min, 2 transfers  (faster but more changes)
      // B is faster but A has fewer transfers → neither dominates
      const direct = makeCandidate('DIRECT', 2400, 0, 0);
      const fastest = makeCandidate('FASTEST', 2100, 2, 0);
      const result = service.filter([direct, fastest]);
      expect(result).toHaveLength(2);
    });

    it('keeps both in NMIA → Malad scenario (massive time difference)', () => {
      // A: 125 min, 0 transfers  (Yellow direct)
      // B: 30 min, 2 transfers   (Airport Express)
      // B is much faster but has more transfers → neither dominates
      const directYellow = makeCandidate('YELLOW', 7500, 0, 0);
      const airportExpress = makeCandidate('L8_COMBO', 1800, 2, 0);
      const result = service.filter([directYellow, airportExpress]);
      expect(result).toHaveLength(2);
    });

    it('removes a candidate dominated in all 3 dimensions simultaneously', () => {
      // C is strictly worse than B on all three — should be removed
      const b = makeCandidate('B', 2000, 1, 400);
      const c = makeCandidate('C', 2500, 2, 600);
      const result = service.filter([b, c]);
      expect(result.map((r) => r.id)).toContain('B');
      expect(result.map((r) => r.id)).not.toContain('C');
    });

    it('keeps candidates that are tied on one dimension and better on another', () => {
      // A and B: same duration, different transfers
      const a = makeCandidate('A', 1800, 0, 0);
      const b = makeCandidate('B', 1800, 2, 0);
      // A dominates B (same duration, same walking, fewer transfers)
      const result = service.filter([a, b]);
      expect(result.map((r) => r.id)).toContain('A');
      expect(result.map((r) => r.id)).not.toContain('B');
    });

    it('preserves a "fewest transfers + more walking" candidate vs "least walking"', () => {
      const a = makeCandidate('A', 1800, 1, 0); // fast, 1 transfer, no walking
      const b = makeCandidate('B', 2400, 0, 200); // slower, 0 transfers, some walking
      // A has fewer transfers + less walking + faster → dominates b? No:
      // A has 1 transfer, B has 0 → B has fewer transfers → A does NOT dominate B
      const result = service.filter([a, b]);
      expect(result).toHaveLength(2);
    });

    it('removes absurd circuitous detour (+55 min slower, more transfers)', () => {
      // Normal: 83 min, 2 transfers, 690s walk
      // Detour: 138 min, 3 transfers, 450s walk
      const normal = makeCandidate('NORMAL', 5000, 2, 690);
      const detour = makeCandidate('DETOUR', 8282, 3, 450);
      const result = service.filter([normal, detour]);
      expect(result.map((c) => c.id)).toContain('NORMAL');
      expect(result.map((c) => c.id)).not.toContain('DETOUR');
    });

    it('removes candidate with equal transfers that is > 35% slower', () => {
      const normal = makeCandidate('A', 2000, 1, 300);
      const slow = makeCandidate('B', 3200, 1, 300); // 60% slower, same transfers
      const result = service.filter([normal, slow]);
      expect(result.map((c) => c.id)).toContain('A');
      expect(result.map((c) => c.id)).not.toContain('B');
    });

    it('prunes candidate that trades 20 minutes slower transit for trivial 30s walking savings', () => {
      const fast = makeCandidate('FAST', 1800, 2, 300);
      const badTradeoff = makeCandidate('BAD_TRADE', 3000, 2, 270); // +20 min slower for -30s walk
      const result = service.filter([fast, badTradeoff]);
      expect(result.map((c) => c.id)).toContain('FAST');
      expect(result.map((c) => c.id)).not.toContain('BAD_TRADE');
    });

    it('handles single candidate (no filtering applied)', () => {
      const result = service.filter([makeCandidate('A', 1800, 1, 100)]);
      expect(result).toHaveLength(1);
    });

    it('handles empty input', () => {
      expect(service.filter([])).toEqual([]);
    });
  });
});
