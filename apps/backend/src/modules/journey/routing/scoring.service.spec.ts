import { EdgeType } from '../graph/edge.types';
import { DEFAULT_WEIGHTS, GraphEdge } from '../graph/graph.types';
import { ScoringService } from './scoring.service';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  it('should return score=100 for an empty path', () => {
    const result = service.score([], DEFAULT_WEIGHTS);
    expect(result.score).toBe(100);
    expect(result.transfers).toBe(0);
    expect(result.totalDuration).toBe(0);
  });

  it('should compute correct total duration', () => {
    const edges: GraphEdge[] = [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 120, lineId: 'L1' },
      { from: 'B', to: 'C', type: EdgeType.TRANSIT, duration: 180, lineId: 'L1' },
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.totalDuration).toBe(300); // 5 minutes
    expect(result.transfers).toBe(0);
    expect(result.walkingDuration).toBe(0);
  });

  it('should detect one transfer on line change', () => {
    const edges: GraphEdge[] = [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 120, lineId: 'L1' },
      { from: 'B', to: 'C', type: EdgeType.TRANSIT, duration: 180, lineId: 'L2' }, // line change!
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.transfers).toBe(1);
  });

  it('should not count same-line consecutive edges as transfers', () => {
    const edges: GraphEdge[] = [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 120, lineId: 'L1' },
      { from: 'B', to: 'C', type: EdgeType.TRANSIT, duration: 120, lineId: 'L1' },
      { from: 'C', to: 'D', type: EdgeType.TRANSIT, duration: 120, lineId: 'L1' },
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.transfers).toBe(0);
  });

  it('should count walking duration separately', () => {
    const edges: GraphEdge[] = [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 300, lineId: 'L1' },
      { from: 'B', to: 'C', type: EdgeType.WALK, duration: 600 },
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.totalDuration).toBe(900);
    expect(result.walkingDuration).toBe(600);
  });

  it('should produce a lower score for longer journeys', () => {
    const shortEdges: GraphEdge[] = [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 300, lineId: 'L1' },
    ];
    const longEdges: GraphEdge[] = [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 3600, lineId: 'L1' },
    ];
    const shortScore = service.score(shortEdges, DEFAULT_WEIGHTS).score;
    const longScore = service.score(longEdges, DEFAULT_WEIGHTS).score;
    expect(shortScore).toBeGreaterThan(longScore);
  });

  it('should clamp score to 0 for very long journeys', () => {
    const edges: GraphEdge[] = [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 86400, lineId: 'L1' }, // 24 hours
    ];
    const result = service.score(edges, DEFAULT_WEIGHTS);
    expect(result.score).toBe(0);
  });

  it('should respect custom weights', () => {
    const edges: GraphEdge[] = [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 600, lineId: 'L1' },
    ];
    const highWeightResult = service.score(edges, { ...DEFAULT_WEIGHTS, travelTimeWeight: 5.0 });
    const lowWeightResult = service.score(edges, { ...DEFAULT_WEIGHTS, travelTimeWeight: 1.0 });
    expect(highWeightResult.score).toBeLessThan(lowWeightResult.score);
  });
});
