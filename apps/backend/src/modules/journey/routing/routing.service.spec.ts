import { EdgeType } from '../graph/edge.types';
import { DEFAULT_WEIGHTS, GraphEdge, StationNode, TransitGraph } from '../graph/graph.types';
import { RoutingService } from './routing.service';

function buildTestGraph(): TransitGraph {
  //
  // Simple 4-station graph:
  //
  //   A --[Blue,120s]--> B --[Blue,180s]--> C
  //                       \
  //                        --[Yellow,240s]--> D
  //
  const nodes = new Map<string, StationNode>([
    ['A', { id: 'A', code: 'A', name: 'Station A', systemId: 'sys1', lineIds: ['L1'], lat: 0, lng: 0 }],
    ['B', { id: 'B', code: 'B', name: 'Station B', systemId: 'sys1', lineIds: ['L1', 'L2'], lat: 0, lng: 1 }],
    ['C', { id: 'C', code: 'C', name: 'Station C', systemId: 'sys1', lineIds: ['L1'], lat: 0, lng: 2 }],
    ['D', { id: 'D', code: 'D', name: 'Station D', systemId: 'sys1', lineIds: ['L2'], lat: 1, lng: 1 }],
  ]);

  const edges = new Map<string, GraphEdge[]>([
    ['A', [
      { from: 'A', to: 'B', type: EdgeType.TRANSIT, duration: 120, lineId: 'L1' },
    ]],
    ['B', [
      { from: 'B', to: 'A', type: EdgeType.TRANSIT, duration: 120, lineId: 'L1' },
      { from: 'B', to: 'C', type: EdgeType.TRANSIT, duration: 180, lineId: 'L1' },
      { from: 'B', to: 'D', type: EdgeType.TRANSIT, duration: 240, lineId: 'L2' },
    ]],
    ['C', [
      { from: 'C', to: 'B', type: EdgeType.TRANSIT, duration: 180, lineId: 'L1' },
    ]],
    ['D', [
      { from: 'D', to: 'B', type: EdgeType.TRANSIT, duration: 240, lineId: 'L2' },
    ]],
  ]);

  return {
    systemId: 'sys1',
    systemCode: 'TEST',
    nodes,
    edges,
    builtAt: Date.now(),
  };
}

describe('RoutingService', () => {
  let service: RoutingService;

  beforeEach(() => {
    service = new RoutingService();
  });

  it('should find direct path A → C via Blue Line', () => {
    const graph = buildTestGraph();
    const path = service.solve(graph, 'A', 'C', DEFAULT_WEIGHTS);

    expect(path).not.toBeNull();
    expect(path!.length).toBe(2); // A→B, B→C
    expect(path![0].from).toBe('A');
    expect(path![0].to).toBe('B');
    expect(path![1].from).toBe('B');
    expect(path![1].to).toBe('C');
    expect(path!.every((e) => e.lineId === 'L1')).toBe(true);
  });

  it('should find direct path A → D', () => {
    const graph = buildTestGraph();
    const path = service.solve(graph, 'A', 'D', DEFAULT_WEIGHTS);

    expect(path).not.toBeNull();
    expect(path!.length).toBe(2); // A→B, B→D
    expect(path![0].from).toBe('A');
    expect(path![1].to).toBe('D');
  });

  it('should return empty array for same station', () => {
    const graph = buildTestGraph();
    const path = service.solve(graph, 'A', 'A', DEFAULT_WEIGHTS);
    expect(path).toEqual([]);
  });

  it('should return null for disconnected stations', () => {
    const graph = buildTestGraph();
    // Add an isolated node
    graph.nodes.set('Z', { id: 'Z', code: 'Z', name: 'Station Z', systemId: 'sys1', lineIds: [], lat: 9, lng: 9 });
    graph.edges.set('Z', []);
    const path = service.solve(graph, 'A', 'Z', DEFAULT_WEIGHTS);
    expect(path).toBeNull();
  });

  it('should return null for unknown station', () => {
    const graph = buildTestGraph();
    const path = service.solve(graph, 'A', 'UNKNOWN', DEFAULT_WEIGHTS);
    expect(path).toBeNull();
  });

  it('should prefer shortest path with custom weights', () => {
    // If walking weight is very high, it should still pick transit
    const weights = { ...DEFAULT_WEIGHTS, travelTimeWeight: 1.0, walkingWeight: 10.0 };
    const graph = buildTestGraph();
    const path = service.solve(graph, 'A', 'C', weights);
    expect(path).not.toBeNull();
    expect(path!.every((e) => e.type === EdgeType.TRANSIT)).toBe(true);
  });
});
