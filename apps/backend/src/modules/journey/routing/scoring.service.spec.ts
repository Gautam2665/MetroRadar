import { EdgeType } from '../graph/edge.types';
import { DEFAULT_WEIGHTS, GraphEdge } from '../graph/graph.types';
import { ScoringService } from './scoring.service';
import { CandidateAttributes, CandidateTradeoffs } from './candidate.types';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  // ── score() ──────────────────────────────────────────────────────────────────

  it('should return score=100 for an empty path', () => {
    const result = service.score([], DEFAULT_WEIGHTS);
    expect(result.score).toBe(100);
    expect(result.transfers).toBe(0);
    expect(result.totalDuration).toBe(0);
  });

  it('should compute correct in-vehicle duration', () => {
    const edges: GraphEdge[] = [
      {
        from: 'A',
        to: 'B',
        type: EdgeType.TRANSIT,
        duration: 120,
        lineId: 'L1',
      },
      {
        from: 'B',
        to: 'C',
        type: EdgeType.TRANSIT,
        duration: 180,
        lineId: 'L1',
      },
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.totalDuration).toBe(300);
    expect(result.inVehicleSeconds).toBe(300);
    expect(result.walkingSeconds).toBe(0);
    expect(result.transfers).toBe(0);
  });

  it('should detect one transfer on line change', () => {
    const edges: GraphEdge[] = [
      {
        from: 'A',
        to: 'B',
        type: EdgeType.TRANSIT,
        duration: 120,
        lineId: 'L1',
      },
      {
        from: 'B',
        to: 'C',
        type: EdgeType.TRANSIT,
        duration: 180,
        lineId: 'L2',
      }, // line change!
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.transfers).toBe(1);
  });

  it('should not count same-line consecutive edges as transfers', () => {
    const edges: GraphEdge[] = [
      {
        from: 'A',
        to: 'B',
        type: EdgeType.TRANSIT,
        duration: 120,
        lineId: 'L1',
      },
      {
        from: 'B',
        to: 'C',
        type: EdgeType.TRANSIT,
        duration: 120,
        lineId: 'L1',
      },
      {
        from: 'C',
        to: 'D',
        type: EdgeType.TRANSIT,
        duration: 120,
        lineId: 'L1',
      },
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.transfers).toBe(0);
  });

  it('should count walking duration separately from in-vehicle', () => {
    const edges: GraphEdge[] = [
      {
        from: 'A',
        to: 'B',
        type: EdgeType.TRANSIT,
        duration: 300,
        lineId: 'L1',
      },
      { from: 'B', to: 'C', type: EdgeType.WALK, duration: 600 },
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.totalDuration).toBe(900);
    expect(result.walkingSeconds).toBe(600);
    expect(result.inVehicleSeconds).toBe(300);
  });

  it('should produce a lower score for longer journeys', () => {
    const shortScore = service.score(
      [
        {
          from: 'A',
          to: 'B',
          type: EdgeType.TRANSIT,
          duration: 300,
          lineId: 'L1',
        },
      ],
      DEFAULT_WEIGHTS,
    ).score;
    const longScore = service.score(
      [
        {
          from: 'A',
          to: 'B',
          type: EdgeType.TRANSIT,
          duration: 3600,
          lineId: 'L1',
        },
      ],
      DEFAULT_WEIGHTS,
    ).score;
    expect(shortScore).toBeGreaterThan(longScore);
  });

  it('should clamp score to 0 for very long journeys', () => {
    const result = service.score(
      [
        {
          from: 'A',
          to: 'B',
          type: EdgeType.TRANSIT,
          duration: 86400,
          lineId: 'L1',
        },
      ], // 24 hrs
      DEFAULT_WEIGHTS,
    );
    expect(result.score).toBe(0);
  });

  it('should respect custom travelTimeWeight', () => {
    const edges: GraphEdge[] = [
      {
        from: 'A',
        to: 'B',
        type: EdgeType.TRANSIT,
        duration: 600,
        lineId: 'L1',
      },
    ];
    const highWeightResult = service.score(edges, {
      ...DEFAULT_WEIGHTS,
      travelTimeWeight: 5.0,
    });
    const lowWeightResult = service.score(edges, {
      ...DEFAULT_WEIGHTS,
      travelTimeWeight: 1.0,
    });
    expect(highWeightResult.score).toBeLessThan(lowWeightResult.score);
  });

  // ── rankScore() ──────────────────────────────────────────────────────────────

  it('rankScore should prefer fewer transfers for equal duration', () => {
    const scoreWith0 = service.rankScore(1800, 0, 0);
    const scoreWith2 = service.rankScore(1800, 2, 0);
    expect(scoreWith0).toBeLessThan(scoreWith2);
  });

  it('rankScore should prefer shorter duration for equal transfers', () => {
    const scoreFast = service.rankScore(1200, 1, 0);
    const scoreSlow = service.rankScore(2400, 1, 0);
    expect(scoreFast).toBeLessThan(scoreSlow);
  });

  // ── computeAttributes() ─────────────────────────────────────────────────────

  function makeCandidateStub(
    durationSeconds: number,
    transfers: number,
    walkingSeconds: number,
  ): {
    durationSeconds: number;
    transfers: number;
    walkingSeconds: number;
    isDirect: boolean;
    attributes: CandidateAttributes;
  } {
    return {
      durationSeconds,
      transfers,
      walkingSeconds,
      isDirect: transfers === 0,
      attributes: {
        fastest: false,
        fewestTransfers: false,
        direct: false,
        leastWalking: false,
        accessibilityFriendly: false,
      },
    };
  }

  it('computeAttributes should tag fastest, direct, fewestTransfers, leastWalking', () => {
    const c1 = makeCandidateStub(1200, 0, 300); // direct + fewest transfers + fastest
    const c2 = makeCandidateStub(2400, 2, 600); // slowest
    const c3 = makeCandidateStub(1800, 1, 100); // least walking

    service.computeAttributes([c1, c2, c3]);

    expect(c1.attributes.fastest).toBe(true);
    expect(c1.attributes.direct).toBe(true);
    expect(c1.attributes.fewestTransfers).toBe(true);

    expect(c3.attributes.leastWalking).toBe(true);

    expect(c2.attributes.fastest).toBe(false);
    expect(c2.attributes.direct).toBe(false);
  });

  it('computeAttributes: multiple candidates can share the fastest tag if tied', () => {
    const c1 = makeCandidateStub(1200, 0, 0);
    const c2 = makeCandidateStub(1200, 1, 0);
    service.computeAttributes([c1, c2]);
    expect(c1.attributes.fastest).toBe(true);
    expect(c2.attributes.fastest).toBe(true); // tied
  });

  // ── computeTradeoffs() ───────────────────────────────────────────────────────

  function makeTradeoffStub(
    durationSeconds: number,
    transfers: number,
  ): {
    durationSeconds: number;
    transfers: number;
    walkingSeconds: number;
    tradeoffs: CandidateTradeoffs;
  } {
    return {
      durationSeconds,
      transfers,
      walkingSeconds: 0,
      tradeoffs: {
        durationDeltaSeconds: 0,
        transferDelta: 0,
        walkingDeltaMeters: 0,
      },
    };
  }

  it('computeTradeoffs should set rank-1 deltas to 0', () => {
    const c1 = makeTradeoffStub(1200, 0);
    const c2 = makeTradeoffStub(2400, 2);
    service.computeTradeoffs([c1, c2]);
    expect(c1.tradeoffs.durationDeltaSeconds).toBe(0);
    expect(c1.tradeoffs.transferDelta).toBe(0);
  });

  it('computeTradeoffs: candidate faster than rank-1 has negative durationDelta', () => {
    const c1 = makeTradeoffStub(2400, 0); // rank-1 (direct but slow)
    const c2 = makeTradeoffStub(1200, 2); // faster, more transfers
    service.computeTradeoffs([c1, c2]);
    expect(c2.tradeoffs.durationDeltaSeconds).toBe(-1200); // c2 is 20 min faster
    expect(c2.tradeoffs.transferDelta).toBe(2);
  });
});
