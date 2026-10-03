import { EdgeType } from '../graph/edge.types';
import {
  DEFAULT_WEIGHTS,
  GraphEdge,
  StationNode,
  TransitGraph,
} from '../graph/graph.types';
import { RoutingService } from './routing.service';

// ── Graph Builders ────────────────────────────────────────────────────────────

/**
 * Simple 4-station graph:
 *
 *   A --[Blue,120s]--> B --[Blue,180s]--> C
 *                       \
 *                        --[Yellow,240s]--> D
 */
function buildTestGraph(): TransitGraph {
  const nodes = new Map<string, StationNode>([
    [
      'A',
      {
        id: 'A',
        code: 'A',
        name: 'Station A',
        systemId: 'sys1',
        lineIds: ['L1'],
        lat: 0,
        lng: 0,
      },
    ],
    [
      'B',
      {
        id: 'B',
        code: 'B',
        name: 'Station B',
        systemId: 'sys1',
        lineIds: ['L1', 'L2'],
        lat: 0,
        lng: 1,
      },
    ],
    [
      'C',
      {
        id: 'C',
        code: 'C',
        name: 'Station C',
        systemId: 'sys1',
        lineIds: ['L1'],
        lat: 0,
        lng: 2,
      },
    ],
    [
      'D',
      {
        id: 'D',
        code: 'D',
        name: 'Station D',
        systemId: 'sys1',
        lineIds: ['L2'],
        lat: 1,
        lng: 1,
      },
    ],
  ]);

  const edges = new Map<string, GraphEdge[]>([
    [
      'A',
      [
        {
          from: 'A',
          to: 'B',
          type: EdgeType.TRANSIT,
          duration: 120,
          lineId: 'L1',
        },
      ],
    ],
    [
      'B',
      [
        {
          from: 'B',
          to: 'A',
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
        {
          from: 'B',
          to: 'D',
          type: EdgeType.TRANSIT,
          duration: 240,
          lineId: 'L2',
        },
      ],
    ],
    [
      'C',
      [
        {
          from: 'C',
          to: 'B',
          type: EdgeType.TRANSIT,
          duration: 180,
          lineId: 'L1',
        },
      ],
    ],
    [
      'D',
      [
        {
          from: 'D',
          to: 'B',
          type: EdgeType.TRANSIT,
          duration: 240,
          lineId: 'L2',
        },
      ],
    ],
  ]);

  return {
    systemId: 'sys1',
    systemCode: 'TEST',
    nodes,
    edges,
    builtAt: Date.now(),
  };
}

/**
 * Test Case 1: Yamuna Bank → Dwarka Sector 21 analog
 *
 * Topology:
 *   YB --[Blue,2400s]--> D21          (direct, 40 min, 0 transfers)
 *   YB --[Blue,600s]--> IK --[Yellow,300s]--> NS --[Orange,300s]--> D21
 *                                              (via 2 transfers, 35 min raw, 2 transfers)
 *
 * Expected: both paths generated, direct is NOT eliminated by dominance
 * (it has 0 transfers, the faster path has 2 → neither dominates the other)
 */
function buildYamunaBankGraph(): TransitGraph {
  const nodes = new Map<string, StationNode>([
    [
      'YB',
      {
        id: 'YB',
        code: 'YB',
        name: 'Yamuna Bank',
        systemId: 'DMRC',
        lineIds: ['BLUE'],
        lat: 28.61,
        lng: 77.3,
      },
    ],
    [
      'IK',
      {
        id: 'IK',
        code: 'IK',
        name: 'Indraprastha',
        systemId: 'DMRC',
        lineIds: ['BLUE', 'YELLOW'],
        lat: 28.61,
        lng: 77.28,
      },
    ],
    [
      'NS',
      {
        id: 'NS',
        code: 'NS',
        name: 'New Delhi',
        systemId: 'DMRC',
        lineIds: ['YELLOW', 'ORANGE'],
        lat: 28.64,
        lng: 77.22,
      },
    ],
    [
      'D21',
      {
        id: 'D21',
        code: 'D21',
        name: 'Dwarka Sector 21',
        systemId: 'DMRC',
        lineIds: ['BLUE', 'ORANGE'],
        lat: 28.55,
        lng: 77.06,
      },
    ],
  ]);

  const edges = new Map<string, GraphEdge[]>([
    [
      'YB',
      [
        // Direct Blue Line to Dwarka Sector 21 (40 min)
        {
          from: 'YB',
          to: 'D21',
          type: EdgeType.TRANSIT,
          duration: 2400,
          lineId: 'BLUE',
        },
        // Blue to interchange at Indraprastha
        {
          from: 'YB',
          to: 'IK',
          type: EdgeType.TRANSIT,
          duration: 600,
          lineId: 'BLUE',
        },
      ],
    ],
    [
      'IK',
      [
        {
          from: 'IK',
          to: 'YB',
          type: EdgeType.TRANSIT,
          duration: 600,
          lineId: 'BLUE',
        },
        // Transfer to Yellow at Indraprastha
        {
          from: 'IK',
          to: 'NS',
          type: EdgeType.TRANSIT,
          duration: 300,
          lineId: 'YELLOW',
        },
      ],
    ],
    [
      'NS',
      [
        {
          from: 'NS',
          to: 'IK',
          type: EdgeType.TRANSIT,
          duration: 300,
          lineId: 'YELLOW',
        },
        // Transfer to Orange (Airport Express) at New Delhi
        {
          from: 'NS',
          to: 'D21',
          type: EdgeType.TRANSIT,
          duration: 900,
          lineId: 'ORANGE',
        },
      ],
    ],
    [
      'D21',
      [
        {
          from: 'D21',
          to: 'YB',
          type: EdgeType.TRANSIT,
          duration: 2400,
          lineId: 'BLUE',
        },
        {
          from: 'D21',
          to: 'NS',
          type: EdgeType.TRANSIT,
          duration: 900,
          lineId: 'ORANGE',
        },
      ],
    ],
  ]);

  return {
    systemId: 'DMRC',
    systemCode: 'DMRC',
    nodes,
    edges,
    builtAt: Date.now(),
  };
}

/**
 * Test Case 2: NMIA → Malad analog (Airport Express use case)
 *
 * Topology:
 *   NMIA --[Yellow,7500s]--> MALAD     (direct yellow, 125 min, 0 transfers)
 *   NMIA --[L8,900s]--> HUB --[L3,600s]--> JXN --[L2,600s]--> MALAD
 *                                           (airport express, 35 min, 2 transfers)
 *
 * Expected: both paths generated, neither dominates the other
 * (direct is 0 transfers but very slow; fast route is much shorter but has 2 transfers)
 */
function buildNmiaGraph(): TransitGraph {
  const nodes = new Map<string, StationNode>([
    [
      'NMIA',
      {
        id: 'NMIA',
        code: 'NMIA',
        name: 'NMIA Airport',
        systemId: 'MM',
        lineIds: ['YELLOW', 'L8'],
        lat: 18.98,
        lng: 73.01,
      },
    ],
    [
      'HUB',
      {
        id: 'HUB',
        code: 'HUB',
        name: 'Hub Station',
        systemId: 'MM',
        lineIds: ['L8', 'L3'],
        lat: 19.07,
        lng: 72.87,
      },
    ],
    [
      'JXN',
      {
        id: 'JXN',
        code: 'JXN',
        name: 'Junction',
        systemId: 'MM',
        lineIds: ['L3', 'L2'],
        lat: 19.1,
        lng: 72.86,
      },
    ],
    [
      'MALAD',
      {
        id: 'MALAD',
        code: 'MALAD',
        name: 'Malad',
        systemId: 'MM',
        lineIds: ['YELLOW', 'L2'],
        lat: 19.19,
        lng: 72.85,
      },
    ],
  ]);

  const edges = new Map<string, GraphEdge[]>([
    [
      'NMIA',
      [
        // Direct Yellow Line to Malad (125 min — very slow)
        {
          from: 'NMIA',
          to: 'MALAD',
          type: EdgeType.TRANSIT,
          duration: 7500,
          lineId: 'YELLOW',
        },
        // Airport Express L8
        {
          from: 'NMIA',
          to: 'HUB',
          type: EdgeType.TRANSIT,
          duration: 900,
          lineId: 'L8',
        },
      ],
    ],
    [
      'HUB',
      [
        {
          from: 'HUB',
          to: 'NMIA',
          type: EdgeType.TRANSIT,
          duration: 900,
          lineId: 'L8',
        },
        {
          from: 'HUB',
          to: 'JXN',
          type: EdgeType.TRANSIT,
          duration: 600,
          lineId: 'L3',
        },
      ],
    ],
    [
      'JXN',
      [
        {
          from: 'JXN',
          to: 'HUB',
          type: EdgeType.TRANSIT,
          duration: 600,
          lineId: 'L3',
        },
        {
          from: 'JXN',
          to: 'MALAD',
          type: EdgeType.TRANSIT,
          duration: 600,
          lineId: 'L2',
        },
      ],
    ],
    [
      'MALAD',
      [
        {
          from: 'MALAD',
          to: 'NMIA',
          type: EdgeType.TRANSIT,
          duration: 7500,
          lineId: 'YELLOW',
        },
        {
          from: 'MALAD',
          to: 'JXN',
          type: EdgeType.TRANSIT,
          duration: 600,
          lineId: 'L2',
        },
      ],
    ],
  ]);

  return {
    systemId: 'MM',
    systemCode: 'MM',
    nodes,
    edges,
    builtAt: Date.now(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RoutingService', () => {
  let service: RoutingService;

  beforeEach(() => {
    service = new RoutingService();
  });

  // ── solve() backward compatibility ───────────────────────────────────────────

  it('solve(): should find direct path A → C via Blue Line', () => {
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

  it('solve(): should find path A → D', () => {
    const graph = buildTestGraph();
    const path = service.solve(graph, 'A', 'D', DEFAULT_WEIGHTS);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2); // A→B, B→D
    expect(path![0].from).toBe('A');
    expect(path![1].to).toBe('D');
  });

  it('solve(): should return empty array for same station', () => {
    const graph = buildTestGraph();
    expect(service.solve(graph, 'A', 'A', DEFAULT_WEIGHTS)).toEqual([]);
  });

  it('solve(): should return null for disconnected stations', () => {
    const graph = buildTestGraph();
    graph.nodes.set('Z', {
      id: 'Z',
      code: 'Z',
      name: 'Z',
      systemId: 'sys1',
      lineIds: [],
      lat: 9,
      lng: 9,
    });
    graph.edges.set('Z', []);
    expect(service.solve(graph, 'A', 'Z', DEFAULT_WEIGHTS)).toBeNull();
  });

  it('solve(): should return null for unknown station', () => {
    const graph = buildTestGraph();
    expect(service.solve(graph, 'A', 'UNKNOWN', DEFAULT_WEIGHTS)).toBeNull();
  });

  // ── solveKShortest() ─────────────────────────────────────────────────────────

  it('solveKShortest(): k=1 returns exactly 1 path', () => {
    const graph = buildTestGraph();
    const paths = service.solveKShortest(graph, 'A', 'C', DEFAULT_WEIGHTS, 1);
    expect(paths.length).toBe(1);
  });

  it('solveKShortest(): returns multiple distinct paths when available', () => {
    const graph = buildTestGraph();
    const paths = service.solveKShortest(graph, 'A', 'C', DEFAULT_WEIGHTS, 3);
    expect(paths.length).toBeGreaterThanOrEqual(1);
    // All paths must start at A and end at C
    for (const path of paths) {
      expect(path[0].from).toBe('A');
      expect(path[path.length - 1].to).toBe('C');
    }
  });

  it('solveKShortest(): paths are distinct (no duplicates)', () => {
    const graph = buildTestGraph();
    const paths = service.solveKShortest(graph, 'A', 'C', DEFAULT_WEIGHTS, 5);
    const signatures = paths.map((p) =>
      p.map((e) => `${e.from}→${e.to}`).join('|'),
    );
    const unique = new Set(signatures);
    expect(unique.size).toBe(signatures.length);
  });

  it('solveKShortest(): returns empty array for same station', () => {
    const graph = buildTestGraph();
    expect(service.solveKShortest(graph, 'A', 'A', DEFAULT_WEIGHTS, 5)).toEqual(
      [],
    );
  });

  it('solveKShortest(): returns empty array for unknown station', () => {
    const graph = buildTestGraph();
    expect(
      service.solveKShortest(graph, 'A', 'UNKNOWN', DEFAULT_WEIGHTS, 5),
    ).toEqual([]);
  });

  // ── Test Case 1: Yamuna Bank → Dwarka Sector 21 ──────────────────────────────

  describe('Yamuna Bank → Dwarka Sector 21', () => {
    it('should include the direct Blue Line route in candidates', () => {
      const graph = buildYamunaBankGraph();
      const paths = service.solveKShortest(
        graph,
        'YB',
        'D21',
        DEFAULT_WEIGHTS,
        5,
      );

      expect(paths.length).toBeGreaterThanOrEqual(1);

      // At least one path must be a direct single-line journey (no line change)
      const hasDirectBlue = paths.some((path) =>
        path.every((e) => e.lineId === 'BLUE'),
      );
      expect(hasDirectBlue).toBe(true);
    });

    it('should also find the faster 2-transfer route as a candidate', () => {
      const graph = buildYamunaBankGraph();
      const paths = service.solveKShortest(
        graph,
        'YB',
        'D21',
        DEFAULT_WEIGHTS,
        5,
      );

      // The 2-transfer route (Blue→Yellow→Orange) must also be found
      const hasMultiLine = paths.some((path) => {
        const lineIds = path.map((e) => e.lineId).filter(Boolean);
        return new Set(lineIds).size >= 2;
      });
      expect(hasMultiLine).toBe(true);
    });
  });

  // ── Test Case 2: NMIA → Malad (Airport Express) ──────────────────────────────

  describe('NMIA → Malad (Airport Express)', () => {
    it('should include both the direct slow route and the fast airport express route', () => {
      const graph = buildNmiaGraph();
      const paths = service.solveKShortest(
        graph,
        'NMIA',
        'MALAD',
        DEFAULT_WEIGHTS,
        5,
      );

      expect(paths.length).toBeGreaterThanOrEqual(1);

      // Direct Yellow Line path
      const hasDirectYellow = paths.some((path) =>
        path.every((e) => e.lineId === 'YELLOW'),
      );

      // Fast airport express path (uses L8 + L3 + L2)
      const hasAirportExpress = paths.some((path) => {
        const lineSet = new Set(path.map((e) => e.lineId).filter(Boolean));
        return lineSet.has('L8');
      });

      expect(hasDirectYellow).toBe(true);
      expect(hasAirportExpress).toBe(true);
    });

    it('airport express route should be faster than direct Yellow in raw duration', () => {
      const graph = buildNmiaGraph();
      const paths = service.solveKShortest(
        graph,
        'NMIA',
        'MALAD',
        DEFAULT_WEIGHTS,
        5,
      );

      const rawDuration = (path: GraphEdge[]) =>
        path.reduce((sum, e) => sum + e.duration, 0);

      const directYellow = paths.find((p) =>
        p.every((e) => e.lineId === 'YELLOW'),
      );
      const airportExpress = paths.find((p) => {
        const lineSet = new Set(p.map((e) => e.lineId).filter(Boolean));
        return lineSet.has('L8');
      });

      expect(directYellow).toBeDefined();
      expect(airportExpress).toBeDefined();
      expect(rawDuration(airportExpress!)).toBeLessThan(
        rawDuration(directYellow!),
      );
    });
  });
});
