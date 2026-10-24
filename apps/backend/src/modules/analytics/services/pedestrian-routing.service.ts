import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  PedestrianRouteOptions,
  PedestrianRouteResult,
  PedestrianRouteStep,
} from '../interfaces/pedestrian-routing.interface';

interface PedGraphEdge {
  id: string;
  osmId: string | null;
  fromNode: string;
  toNode: string;
  lengthMeters: number;
  walkSeconds: number;
  transitionSeconds: number;
  totalCostSeconds: number;
  highwayType: string;
  surface: string | null;
  isElevatedFob: boolean;
  isCrossing: boolean;
  hasTactilePaving: boolean;
  level: string | null;
  sourceType: string;
  coords: number[][]; // [[lon, lat], ...]
}

interface AdjItem {
  toNode: string;
  edge: PedGraphEdge;
  isReversed: boolean;
}

@Injectable()
export class PedestrianRoutingService {
  private readonly logger = new Logger(PedestrianRoutingService.name);

  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Calculates a verified point-to-point pedestrian route between two station entrances
   * along real OSM geometries and explicitly governed supplementary connections.
   */
  async route(
    fromEntranceIdOrName: string,
    toEntranceIdOrName: string,
    options?: PedestrianRouteOptions,
  ): Promise<PedestrianRouteResult> {
    const walkingSpeed = options?.walkingSpeedMs ?? 1.2;
    const allowProvisional = options?.allowProvisional ?? true;

    // 1. Resolve Origin and Destination Entrances
    const [fromEnt, toEnt] = await Promise.all([
      this.resolveEntrance(fromEntranceIdOrName),
      this.resolveEntrance(toEntranceIdOrName),
    ]);

    if (!fromEnt || !toEnt) {
      return {
        status: 'ENTRANCE_NOT_FOUND',
        distanceMeters: 0,
        walkDurationSeconds: 0,
        transitionDurationSeconds: 0,
        totalDurationSeconds: 0,
        geometry: null,
        steps: [],
        provenance: {
          sourceTypes: [],
          confidenceScore: 0,
          containsProvisionalSegments: false,
          hasOfficialOsmSegments: false,
          notes: [
            'One or both station entrances could not be resolved in Canonical Transit Model.',
          ],
          validationDate: new Date().toISOString(),
        },
        errorMessage: `Entrance resolution failed. From: '${fromEntranceIdOrName}', To: '${toEntranceIdOrName}'`,
      };
    }

    if (!fromEnt.snappedNodeId || !toEnt.snappedNodeId) {
      return {
        status: 'DISCONNECTED_GRAPH',
        distanceMeters: 0,
        walkDurationSeconds: 0,
        transitionDurationSeconds: 0,
        totalDurationSeconds: 0,
        geometry: null,
        steps: [],
        provenance: {
          sourceTypes: [],
          confidenceScore: 0,
          containsProvisionalSegments: false,
          hasOfficialOsmSegments: false,
          notes: [
            'Entrance has not been snapped to a valid pedestrian street node.',
          ],
          validationDate: new Date().toISOString(),
        },
        errorMessage: 'Entrance lacks a snapped pedestrian node ID.',
      };
    }

    const startNode = fromEnt.snappedNodeId.toString();
    const targetNode = toEnt.snappedNodeId.toString();

    // 2. Fetch Relevant Pedestrian Edges
    let accessFilter = "WHERE is_active = true AND access != 'private'";
    if (!allowProvisional) {
      accessFilter += " AND source_type != 'PROVISIONAL_SYNTHESIZED'";
    }

    const rawEdges: Array<{
      id: string;
      osm_id: bigint | null;
      from_node_id: bigint | null;
      to_node_id: bigint | null;
      length_meters: number;
      highway_type: string;
      surface: string | null;
      is_elevated_fob: boolean;
      is_crossing: boolean;
      has_tactile_paving: boolean;
      level: string | null;
      source_type: string;
      geojson: string;
    }> = await this.prisma.$queryRawUnsafe(`
      SELECT id, osm_id, from_node_id, to_node_id, length_meters, highway_type, surface,
             is_elevated_fob, is_crossing, has_tactile_paving, level, source_type,
             ST_AsGeoJSON(geom) as geojson
      FROM pedestrian_network
      ${accessFilter}
      AND (
        ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${fromEnt.longitude}, ${fromEnt.latitude}), 4326)::geography, 800)
        OR ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${toEnt.longitude}, ${toEnt.latitude}), 4326)::geography, 800)
      );
    `);

    // 3. Build Adjacency Graph based strictly on shared Node IDs
    const adj = new Map<string, AdjItem[]>();

    for (const re of rawEdges) {
      if (!re.from_node_id || !re.to_node_id) continue;
      const u = re.from_node_id.toString();
      const v = re.to_node_id.toString();
      const lengthM = Number(re.length_meters);
      const isSteps = re.highway_type === 'steps';
      const isCrossing = re.is_crossing;

      const pureWalkSec = lengthM / (isSteps ? 0.6 : walkingSpeed);
      const transitionSec = isSteps ? 15 : isCrossing ? 10 : 0;
      const totalCost = pureWalkSec + transitionSec;

      const parsedGeo = JSON.parse(re.geojson);
      const coords = parsedGeo.coordinates || [];

      const edgeObj: PedGraphEdge = {
        id: re.id,
        osmId: re.osm_id ? re.osm_id.toString() : null,
        fromNode: u,
        toNode: v,
        lengthMeters: lengthM,
        walkSeconds: pureWalkSec,
        transitionSeconds: transitionSec,
        totalCostSeconds: totalCost,
        highwayType: re.highway_type,
        surface: re.surface,
        isElevatedFob: re.is_elevated_fob,
        isCrossing: re.is_crossing,
        hasTactilePaving: re.has_tactile_paving,
        level: re.level,
        sourceType: re.source_type,
        coords,
      };

      if (!adj.has(u)) adj.set(u, []);
      if (!adj.has(v)) adj.set(v, []);

      // Bidirectional traversal
      adj.get(u)!.push({ toNode: v, edge: edgeObj, isReversed: false });
      adj.get(v)!.push({ toNode: u, edge: edgeObj, isReversed: true });
    }

    // 4. Dijkstra Shortest Path Search
    const dist = new Map<string, number>();
    const prev = new Map<
      string,
      { node: string; edge: PedGraphEdge; isReversed: boolean }
    >();
    const pq: Array<{ node: string; cost: number }> = [];

    dist.set(startNode, 0);
    pq.push({ node: startNode, cost: 0 });

    while (pq.length > 0) {
      pq.sort((a, b) => a.cost - b.cost);
      const current = pq.shift()!;

      if (current.node === targetNode) break;
      if (current.cost > (dist.get(current.node) ?? Infinity)) continue;

      const neighbors = adj.get(current.node) || [];
      for (const item of neighbors) {
        const alt = current.cost + item.edge.totalCostSeconds;
        if (!dist.has(item.toNode) || alt < dist.get(item.toNode)!) {
          dist.set(item.toNode, alt);
          prev.set(item.toNode, {
            node: current.node,
            edge: item.edge,
            isReversed: item.isReversed,
          });
          pq.push({ node: item.toNode, cost: alt });
        }
      }
    }

    // If destination node not reached, return clear NO_PATH_FOUND
    if (!dist.has(targetNode)) {
      return {
        status: 'NO_PATH_FOUND',
        originEntrance: {
          id: fromEnt.id,
          name: fromEnt.name,
          stationName: fromEnt.station.name,
          latitude: fromEnt.latitude,
          longitude: fromEnt.longitude,
          snapDistanceMeters: fromEnt.snapDistanceMeters ?? 0,
        },
        destinationEntrance: {
          id: toEnt.id,
          name: toEnt.name,
          stationName: toEnt.station.name,
          latitude: toEnt.latitude,
          longitude: toEnt.longitude,
          snapDistanceMeters: toEnt.snapDistanceMeters ?? 0,
        },
        distanceMeters: 0,
        walkDurationSeconds: 0,
        transitionDurationSeconds: 0,
        totalDurationSeconds: 0,
        geometry: null,
        steps: [],
        provenance: {
          sourceTypes: [],
          confidenceScore: 0,
          containsProvisionalSegments: false,
          hasOfficialOsmSegments: false,
          notes: [
            'Graph search completed: No continuous walkable path exists between these entrances in the active network.',
          ],
          validationDate: new Date().toISOString(),
        },
        errorMessage:
          'Destination entrance is not reachable along valid pedestrian graph edges.',
      };
    }

    // 5. Reconstruct Path Geometry and Navigation Steps
    const pathEdges: Array<{ edge: PedGraphEdge; isReversed: boolean }> = [];
    let curr = targetNode;

    while (prev.has(curr)) {
      const p = prev.get(curr)!;
      pathEdges.unshift({ edge: p.edge, isReversed: p.isReversed });
      curr = p.node;
    }

    const assembledCoords: number[][] = [];
    const steps: PedestrianRouteStep[] = [];
    let totalDistMeters = 0;
    let totalWalkSec = 0;
    let totalTransitionSec = 0;
    const sourceTypesSet = new Set<string>();

    for (let i = 0; i < pathEdges.length; i++) {
      const { edge, isReversed } = pathEdges[i];
      sourceTypesSet.add(edge.sourceType);

      const segmentCoords = isReversed
        ? [...edge.coords].reverse()
        : [...edge.coords];

      // Append coordinates avoiding duplication at segment junctions
      if (assembledCoords.length === 0) {
        assembledCoords.push(...segmentCoords);
      } else {
        assembledCoords.push(...segmentCoords.slice(1));
      }

      totalDistMeters += edge.lengthMeters;
      totalWalkSec += edge.walkSeconds;
      totalTransitionSec += edge.transitionSeconds;

      // Human-readable instruction derivation
      let instruction = '';
      if (edge.isElevatedFob) {
        instruction = `Cross elevated footbridge (${edge.lengthMeters.toFixed(0)}m, Level ${edge.level || '1'})`;
      } else if (edge.highwayType === 'steps') {
        instruction = `Take stairs (${edge.lengthMeters.toFixed(0)}m, ~${Math.round(edge.totalCostSeconds)}s)`;
      } else if (edge.isCrossing) {
        instruction = `Use designated pedestrian street crossing (${edge.lengthMeters.toFixed(0)}m)`;
      } else {
        instruction = `Walk along ${edge.surface || 'paved'} footway (${edge.lengthMeters.toFixed(0)}m)`;
      }

      steps.push({
        stepIndex: i + 1,
        instruction,
        distanceMeters: edge.lengthMeters,
        durationSeconds: Math.round(edge.totalCostSeconds),
        highwayType: edge.highwayType,
        surface: edge.surface,
        isElevatedFob: edge.isElevatedFob,
        isCrossing: edge.isCrossing,
        hasTactilePaving: edge.hasTactilePaving,
        level: edge.level,
        sourceType: edge.sourceType,
        startCoordinate: [segmentCoords[0][0], segmentCoords[0][1]],
        endCoordinate: [
          segmentCoords[segmentCoords.length - 1][0],
          segmentCoords[segmentCoords.length - 1][1],
        ],
      });
    }

    const containsProvisional = sourceTypesSet.has('PROVISIONAL_SYNTHESIZED');
    const hasOfficial = sourceTypesSet.has('OSM_OFFICIAL');
    const confidenceScore = containsProvisional ? 0.85 : 0.98;

    return {
      status: 'SUCCESS',
      originEntrance: {
        id: fromEnt.id,
        name: fromEnt.name,
        stationName: fromEnt.station.name,
        latitude: fromEnt.latitude,
        longitude: fromEnt.longitude,
        snapDistanceMeters: fromEnt.snapDistanceMeters ?? 0,
      },
      destinationEntrance: {
        id: toEnt.id,
        name: toEnt.name,
        stationName: toEnt.station.name,
        latitude: toEnt.latitude,
        longitude: toEnt.longitude,
        snapDistanceMeters: toEnt.snapDistanceMeters ?? 0,
      },
      distanceMeters: parseFloat(totalDistMeters.toFixed(1)),
      walkDurationSeconds: Math.round(totalWalkSec),
      transitionDurationSeconds: Math.round(totalTransitionSec),
      totalDurationSeconds: Math.round(totalWalkSec + totalTransitionSec),
      geometry: {
        type: 'LineString',
        coordinates: assembledCoords,
      },
      steps,
      provenance: {
        sourceTypes: Array.from(sourceTypesSet),
        confidenceScore,
        containsProvisionalSegments: containsProvisional,
        hasOfficialOsmSegments: hasOfficial,
        notes: [
          `Route derived from ${pathEdges.length} connected graph segments.`,
          `Standard walking speed assumed: ${walkingSpeed} m/s.`,
          containsProvisional
            ? 'Contains provisional MMRDA elevated connector link pending ground-truth survey.'
            : 'All route segments verified against official OSM extraction.',
        ],
        validationDate: new Date().toISOString(),
      },
    };
  }

  private async resolveEntrance(query: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        query,
      );

    return this.prisma.entrance.findFirst({
      where: isUuid
        ? { id: query, isActive: true }
        : {
            name: { contains: query, mode: 'insensitive' },
            isActive: true,
          },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }
}
