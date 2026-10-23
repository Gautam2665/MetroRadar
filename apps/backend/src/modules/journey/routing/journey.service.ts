import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { GraphProviderService } from '../graph/graph-provider.service';
import { EdgeType } from '../graph/edge.types';
import { DEFAULT_WEIGHTS, DEFAULT_K } from '../graph/graph.types';
import { RoutingService } from './routing.service';
import { ScoringService } from './scoring.service';
import { CandidateFilterService } from './candidate-filter.service';
import {
  InterchangeEvaluatorService,
  GenericConstraints,
} from './interchange-evaluator.service';
import { RealtimePredictionService } from '../../realtime/services/realtime-prediction.service';
import { JourneyQueryDto } from '../dto/journey-query.dto';
import { computeJourneyFares } from './policy_v1';
import {
  RouteCandidate,
  JourneyLeg,
  JourneyResponse,
  StationRef,
  candidateId,
  CandidateAttributes,
  LegMode,
  DoorSide,
  DoorSideStatus,
  WaitingBreakdown,
} from './candidate.types';
import { GraphEdge } from '../graph/graph.types';

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ── Internal type for enriched-but-not-yet-ranked candidate ──────────────────

interface EnrichedCandidate extends RouteCandidate {
  _rankScore: number; // internal sorting key, not exposed
}

export interface StationGateAccess {
  gateId: string;
  gateName: string;
  stationCode: string;
  stationName: string;
  lineCode: string;
  lineName: string;
  lineColor: string;
  walkDistanceMeters: number;
  walkTimeSeconds: number;
  corridorType: 'WALK' | 'TRAVELATOR' | 'FOB' | 'SUBWAY';
  corridorNote: string;
  indoorLevel: string;
}

export interface LandmarkMeta {
  id: string;
  name: string;
  category?: string;
  hasDirectFob?: boolean;
  hasDirectAccess?: boolean;
  directFobName?: string;
  walkDistanceMeters?: number;
  walkTimeSeconds?: number;
  corridorNote?: string;
  indoorLevel?: string;
}

interface ResolvedGateAttachment {
  gate: StationGateAccess;
  station: {
    id: string;
    code: string;
    name: string;
    systemId: string;
    latitude: number;
    longitude: number;
    system: { id: string; code: string };
  };
}

interface ResolvedEndpoint {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  systemId: string;
  systemCode: string;
  landmark?: LandmarkMeta;
  attachments: ResolvedGateAttachment[];
  primaryStation: {
    id: string;
    code: string;
    name: string;
    systemId: string;
    latitude: number;
    longitude: number;
    system: { id: string; code: string };
  };
}

interface Phase1CtmData {
  alignmentGeometry?: { coordinates: [number, number][] };
}

function parsePhase1Ctm(value: unknown): Phase1CtmData | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  const geometry = (value as { alignmentGeometry?: unknown }).alignmentGeometry;
  if (
    typeof geometry !== 'object' ||
    geometry === null ||
    Array.isArray(geometry)
  )
    return null;
  const coordinates = (geometry as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates)) return null;
  const parsedCoordinates: [number, number][] = [];
  for (const point of coordinates) {
    if (
      !Array.isArray(point) ||
      typeof point[0] !== 'number' ||
      typeof point[1] !== 'number'
    )
      return null;
    parsedCoordinates.push([point[0], point[1]]);
  }
  return { alignmentGeometry: { coordinates: parsedCoordinates } };
}

/**
 * JourneyService — orchestrates the full Journey Intelligence pipeline:
 *
 *  1.  Resolve stations + system
 *  2.  Load transit graph (cache-first via GraphProvider)
 *  3.  Generate K candidate paths (Yen's K-shortest loopless paths)
 *  4.  Enrich each path (timing breakdown, legs, stations, GeoJSON, lines)
 *  5.  Feasibility + dominance filtering (CandidateFilterService)
 *  6.  Score + default-rank surviving candidates
 *  7.  Compute attribute flags + tradeoffs vs rank-1
 *  8.  Return RouteCandidate[]
 *
 * The response is candidate-centric: { metadata, candidates[] }.
 * The Intent engine (future sprint) re-ranks candidates via Intent JSON
 * without re-running the graph algorithm.
 */
@Injectable()
export class JourneyService {
  private readonly logger = new Logger(JourneyService.name);
  private readonly GRAPH_VERSION = 'v2';
  private readonly lineShapeCache = new Map<string, [number, number][]>();
  private readonly directionPlatformCache = new Map<
    string,
    {
      towards: string | null;
      boardingPlatform: string | null;
      alightingPlatform: string | null;
      platformStatus: 'KNOWN' | 'USER_REPORTED' | 'UNKNOWN';
      scheduledDurationSeconds: number | null;
    }
  >();
  private readonly tripHeadsignCache = new Map<string, string | null>();

  constructor(
    private readonly db: DatabaseService,
    private readonly graphProvider: GraphProviderService,
    private readonly router: RoutingService,
    private readonly scorer: ScoringService,
    private readonly filter: CandidateFilterService,
    private readonly interchangeEvaluator: InterchangeEvaluatorService,
    private readonly realtimePrediction: RealtimePredictionService,
  ) {}

  private async findNearestStation(lat: number, lng: number) {
    const stations = await this.db.station.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        latitude: true,
        longitude: true,
        systemId: true,
        system: { select: { id: true, code: true } },
      },
    });
    if (stations.length === 0) return null;
    let closest = stations[0];
    let minD = Infinity;
    for (const s of stations) {
      const d = getDistanceMeters(lat, lng, s.latitude, s.longitude);
      if (d < minD) {
        minD = d;
        closest = s;
      }
    }
    return closest;
  }

  /**
   * Dynamic Spatial Snapper with Per-Line Dominance Filter.
   *
   * 1. Finds all active stations within walk catchment radius R (default: 3800m).
   * 2. De-dupes redundant stations on the exact same line (Per-Line Dominance Filter):
   *    If an origin is within radius of two stations on the exact same line,
   *    only keep the closer one on that specific line.
   *    Example: Airport Road (Line 1, 350m) vs Marol Naka (Line 1, 550m) -> Keep Airport Road for L1.
   *             Marol Naka (Line 3, 550m) -> Kept because it provides direct access to Line 3.
   * 3. Attaches candidate entry edges with walking penalties (T_walk = D_walk / 1.2 m/s).
   */
  private async findSpatialCandidateAttachments(
    lat: number,
    lng: number,
    systemId: string,
  ): Promise<ResolvedGateAttachment[]> {
    const stations = await this.db.station.findMany({
      where: { systemId, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        systemId: true,
        latitude: true,
        longitude: true,
        system: { select: { id: true, code: true } },
        sequences: {
          where: { isActive: true },
          select: {
            lineId: true,
            line: { select: { id: true, code: true, name: true, color: true } },
          },
        },
        entrances: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    // 1. Calculate distance to all stations/entrances
    const nearbyStations: Array<{
      station: (typeof stations)[0];
      distanceMeters: number;
      bestEntrance: (typeof stations)[0]['entrances'][0] | null;
    }> = [];

    for (const stn of stations) {
      let bestEnt: (typeof stn.entrances)[0] | null = null;
      let minEntDist = Infinity;
      if (stn.entrances && stn.entrances.length > 0) {
        for (const ent of stn.entrances) {
          const d = getDistanceMeters(lat, lng, ent.latitude, ent.longitude);
          if (d < minEntDist) {
            minEntDist = d;
            bestEnt = ent;
          }
        }
      }
      const stnCentroidDist = getDistanceMeters(
        lat,
        lng,
        stn.latitude,
        stn.longitude,
      );
      const effectiveDist =
        bestEnt && minEntDist < Infinity ? minEntDist : stnCentroidDist;

      nearbyStations.push({
        station: stn,
        distanceMeters: effectiveDist,
        bestEntrance: bestEnt,
      });
    }

    if (nearbyStations.length === 0) {
      return [];
    }

    // 2. Relative Proximity & Per-Line Dominance Filter:
    // Sort all stations by distance to find the closest feeder station.
    nearbyStations.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const minDist = nearbyStations[0]?.distanceMeters ?? 0;

    // Relative Proximity Feeder Cutoff:
    // In dense linear transit cities like Mumbai, parallel corridors (e.g. Line 7 on Western Express Highway
    // and Line 2A on Link Road) are spaced 2.5km to 4.2km apart. If a locality is close to one line (e.g. 1000m),
    // an overly tight cutoff (e.g. 2500m) would completely starve the locality of the parallel corridor,
    // forcing single-option routing.
    // We allow candidate attachments from each distinct line up to 5000m (or minDist + 3000m),
    // ensuring multi-line corridors (Red Line, Yellow Line, Blue Line, Aqua Line) are available for selection.
    const maxFeederCutoff = Math.max(5000, minDist + 3000, minDist * 2.5);

    const closestPerLine = new Map<
      string,
      {
        station: (typeof stations)[0];
        distanceMeters: number;
        bestEntrance: (typeof stations)[0]['entrances'][0] | null;
        lineInfo?: { id: string; code: string; name: string; color: string };
      }
    >();

    for (const item of nearbyStations) {
      if (item.distanceMeters > maxFeederCutoff) {
        continue;
      }
      const seqs = item.station.sequences || [];
      if (seqs.length === 0) {
        const key = `STN_${item.station.id}`;
        const existing = closestPerLine.get(key);
        if (!existing || item.distanceMeters < existing.distanceMeters) {
          closestPerLine.set(key, {
            station: item.station,
            distanceMeters: item.distanceMeters,
            bestEntrance: item.bestEntrance,
          });
        }
      } else {
        for (const seq of seqs) {
          const lineKey = seq.lineId || seq.line?.code || 'UNKNOWN';
          const existing = closestPerLine.get(lineKey);
          if (!existing || item.distanceMeters < existing.distanceMeters) {
            closestPerLine.set(lineKey, {
              station: item.station,
              distanceMeters: item.distanceMeters,
              bestEntrance: item.bestEntrance,
              lineInfo: seq.line,
            });
          }
        }
      }
    }

    // 3. Convert surviving non-dominated candidates to ResolvedGateAttachments
    const attachments: ResolvedGateAttachment[] = [];
    const seenStations = new Set<string>();

    for (const entry of closestPerLine.values()) {
      const { station, distanceMeters, bestEntrance, lineInfo } = entry;
      const dedupKey = `${station.id}`;
      if (seenStations.has(dedupKey)) continue;
      seenStations.add(dedupKey);

      const walkSecs = Math.max(60, Math.round(distanceMeters / 1.2)); // 1.2 m/s standard transit walking speed
      const walkMins = Math.max(1, Math.round(walkSecs / 60));
      const lineLabel = lineInfo?.name || 'Metro';

      let gateId = `SPATIAL_GATE_${station.code}`;
      let gateName = `Walk to ${station.name} (${lineLabel})`;
      let corridorNote = `Walk ${Math.round(distanceMeters)}m (~${walkMins} min) to ${station.name} for ${lineLabel}`;

      if (bestEntrance) {
        gateId = bestEntrance.id;
        const gateMatch = bestEntrance.name.match(/(Gate\s+[A-Za-z0-9]+)/i);
        const gateCode = gateMatch ? gateMatch[1] : 'Gate';
        const parenMatch = bestEntrance.name.match(/\((.+?)\)/);
        const landmarkDesc = parenMatch
          ? parenMatch[1].trim()
          : bestEntrance.name;

        gateName = `${gateCode} (${landmarkDesc})`;
        corridorNote = `Exit via ${gateCode} towards ${landmarkDesc} (~${Math.round(distanceMeters)}m walk)`;
      }

      const gate: StationGateAccess = {
        gateId,
        gateName,
        stationCode: station.code,
        stationName: station.name,
        lineCode: lineInfo?.code || '',
        lineName: lineLabel,
        lineColor: lineInfo?.color || '#06b6d4',
        walkDistanceMeters: Math.round(distanceMeters),
        walkTimeSeconds: walkSecs,
        corridorType: 'WALK',
        corridorNote,
        indoorLevel: 'Street Level',
      };

      attachments.push({ gate, station });
    }

    if (attachments.length === 0 && nearbyStations.length > 0) {
      const top = nearbyStations[0];
      const seq = top.station.sequences?.[0];
      const lineInfo = seq?.line;
      const lineLabel = lineInfo?.name || 'Metro';
      const walkSecs = Math.max(60, Math.round(top.distanceMeters / 1.2));

      attachments.push({
        station: top.station,
        gate: {
          gateId: top.bestEntrance?.id || `SPATIAL_GATE_${top.station.code}`,
          gateName: top.bestEntrance?.name || `Walk to ${top.station.name}`,
          stationCode: top.station.code,
          stationName: top.station.name,
          lineCode: lineInfo?.code || '',
          lineName: lineLabel,
          lineColor: lineInfo?.color || '#06b6d4',
          walkDistanceMeters: Math.round(top.distanceMeters),
          walkTimeSeconds: walkSecs,
          corridorType: 'WALK',
          corridorNote: `Connect to ${top.station.name}`,
          indoorLevel: 'Street Level',
        },
      });
    }

    return attachments;
  }

  private async resolveEndpoint(
    identifier: string,
  ): Promise<ResolvedEndpoint | null> {
    // 0. Coordinate string format: "lat,lng" or "lat, lng" (optionally with _suffix)
    const coordMatch = identifier.match(
      /^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)(?:_.*)?$/,
    );
    if (coordMatch) {
      const p1 = parseFloat(coordMatch[1]);
      const p2 = parseFloat(coordMatch[3]);
      const lat = p1 < 40 ? p1 : p2;
      const lng = p1 > 40 ? p1 : p2;

      const nearestStation = await this.findNearestStation(lat, lng);
      if (!nearestStation || !nearestStation.system) return null;
      const system = nearestStation.system;

      const attachments = await this.findSpatialCandidateAttachments(
        lat,
        lng,
        system.id,
      );
      if (attachments.length > 0) {
        const primary = attachments[0].station;
        return {
          id: `${lat.toFixed(5)},${lng.toFixed(5)}`,
          name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          code: primary.code,
          latitude: lat,
          longitude: lng,
          systemId: system.id,
          systemCode: system.code,
          landmark: undefined,
          attachments,
          primaryStation: primary,
        };
      }
    }

    // 1. Check if identifier resolves to a physical GTFS Entrance / Gate in PostgreSQL
    const rawPlaceName = identifier.startsWith('place-')
      ? identifier
          .replace(/^place-/, '')
          .replace(/-/g, ' ')
          .trim()
      : identifier.trim();

    const dbEntrance = await this.db.entrance.findFirst({
      where: {
        OR: [
          { id: identifier },
          { name: { equals: identifier, mode: 'insensitive' } },
          { name: { contains: rawPlaceName, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: {
        station: {
          include: {
            system: { select: { id: true, code: true } },
            sequences: {
              where: { isActive: true },
              include: {
                line: {
                  select: { id: true, code: true, name: true, color: true },
                },
              },
            },
          },
        },
      },
    });

    if (dbEntrance && dbEntrance.station) {
      const primaryStation = dbEntrance.station;
      const primaryLine = primaryStation.sequences[0]?.line;
      const isFob =
        dbEntrance.name.toLowerCase().includes('fob') ||
        dbEntrance.name.toLowerCase().includes('skywalk') ||
        dbEntrance.name.toLowerCase().includes('interchange');
      const gateMatch = dbEntrance.name.match(/\bGate\s+([A-Z0-9]+)\b/i);
      const gateCode = gateMatch
        ? `Gate ${gateMatch[1].toUpperCase()}`
        : isFob
          ? 'FOB'
          : 'Gate';
      const parenMatch = dbEntrance.name.match(/\((.+?)\)/);
      const landmarkDesc = parenMatch ? parenMatch[1].trim() : dbEntrance.name;

      const directGate: StationGateAccess = {
        gateId: dbEntrance.id,
        gateName: `${gateCode} · ${landmarkDesc}`,
        stationCode: primaryStation.code,
        stationName: primaryStation.name,
        lineCode: primaryLine?.code || '',
        lineName: primaryLine?.name || '',
        lineColor: primaryLine?.color || '',
        walkDistanceMeters: isFob ? 0 : 50,
        walkTimeSeconds: isFob ? 0 : 40,
        corridorType: isFob ? 'FOB' : 'WALK',
        corridorNote: isFob
          ? `Direct connection via FOB to ${primaryStation.name}. Zero street walking required.`
          : `Access via ${gateCode} (${landmarkDesc})`,
        indoorLevel: 'Concourse',
      };

      const landmarkMeta: LandmarkMeta = {
        id: dbEntrance.id,
        name: landmarkDesc,
        category: isFob ? 'TRANSIT_HUB' : 'COMMERCIAL',
        hasDirectFob: isFob,
        hasDirectAccess: true,
        directFobName: isFob ? dbEntrance.name : undefined,
        walkDistanceMeters: isFob ? 0 : 50,
        walkTimeSeconds: isFob ? 0 : 40,
        corridorNote: directGate.corridorNote,
        indoorLevel: 'Concourse',
      };

      const spatialAttachments = await this.findSpatialCandidateAttachments(
        dbEntrance.latitude,
        dbEntrance.longitude,
        primaryStation.systemId,
      );

      const attachments: ResolvedGateAttachment[] = [
        { gate: directGate, station: primaryStation },
      ];
      for (const sa of spatialAttachments) {
        if (!attachments.some((a) => a.station.id === sa.station.id)) {
          attachments.push(sa);
        }
      }

      return {
        id: dbEntrance.id,
        name: `${primaryStation.name} (${gateCode})`,
        code: primaryStation.code,
        latitude: dbEntrance.latitude,
        longitude: dbEntrance.longitude,
        systemId: primaryStation.systemId,
        systemCode: primaryStation.system.code,
        landmark: landmarkMeta,
        attachments,
        primaryStation,
      };
    }

    // 2. Resolve standard Station by UUID, code, or name
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );
    let stn = isUuid
      ? await this.db.station.findUnique({
          where: { id: identifier },
          select: {
            id: true,
            code: true,
            name: true,
            systemId: true,
            latitude: true,
            longitude: true,
            system: { select: { id: true, code: true } },
          },
        })
      : null;

    if (!stn) {
      stn = await this.db.station.findFirst({
        where: { code: identifier, isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          systemId: true,
          latitude: true,
          longitude: true,
          system: { select: { id: true, code: true } },
        },
      });
    }

    if (!stn) {
      stn = await this.db.station.findFirst({
        where: {
          name: { contains: identifier, mode: 'insensitive' },
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          systemId: true,
          latitude: true,
          longitude: true,
          system: { select: { id: true, code: true } },
        },
      });
    }

    if (!stn && rawPlaceName !== identifier) {
      stn = await this.db.station.findFirst({
        where: {
          name: { contains: rawPlaceName, mode: 'insensitive' },
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          systemId: true,
          latitude: true,
          longitude: true,
          system: { select: { id: true, code: true } },
        },
      });
    }

    // 3. Dynamic geocoding fallback for unindexed landmarks / POIs
    if (!stn && (identifier.startsWith('place-') || rawPlaceName.length >= 3)) {
      try {
        const queryTerm = rawPlaceName;
        const geoUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(queryTerm + ', Mumbai')}&limit=1`;
        const geoRes = await axios.get(geoUrl, { timeout: 3000 });
        const feat = geoRes.data?.features?.[0];
        const coords = feat?.geometry?.coordinates;
        if (coords && coords.length >= 2) {
          const lon = coords[0];
          const lat = coords[1];
          const nearestStation = await this.findNearestStation(lat, lon);
          if (nearestStation && nearestStation.system) {
            const system = nearestStation.system;
            const attachments = await this.findSpatialCandidateAttachments(
              lat,
              lon,
              system.id,
            );
            if (attachments.length > 0) {
              const primary = attachments[0].station;
              const placeName = (feat.properties?.name as string) || queryTerm;
              return {
                id: identifier,
                name: placeName,
                code: primary.code,
                latitude: lat,
                longitude: lon,
                systemId: system.id,
                systemCode: system.code,
                landmark: undefined,
                attachments,
                primaryStation: primary,
              };
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to dynamically geocode place endpoint ${identifier}: ${err}`,
        );
      }
    }

    if (!stn) return null;

    const directGate: StationGateAccess = {
      gateId: 'DIRECT',
      gateName: `${stn.name} Platform Concourse`,
      stationCode: stn.code,
      stationName: stn.name,
      lineCode: '',
      lineName: '',
      lineColor: '',
      walkDistanceMeters: 0,
      walkTimeSeconds: 0,
      corridorType: 'WALK',
      corridorNote: '',
      indoorLevel: 'Concourse',
    };

    return {
      id: stn.id,
      name: stn.name,
      code: stn.code,
      latitude: stn.latitude,
      longitude: stn.longitude,
      systemId: stn.systemId,
      systemCode: stn.system.code,
      attachments: [{ gate: directGate, station: stn }],
      primaryStation: stn,
    };
  }

  private parseDepartureTimeToSeconds(departureTime?: string): number {
    if (!departureTime) return this.getNowSecondsOfDay();
    try {
      if (departureTime.includes('T')) {
        const d = new Date(departureTime);
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(d.getTime() + istOffsetMs);
        return (
          istDate.getUTCHours() * 3600 +
          istDate.getUTCMinutes() * 60 +
          istDate.getUTCSeconds()
        );
      }
      if (departureTime.includes(':')) {
        const parts = departureTime.split(':').map(Number);
        const hrs = (parts[0] || 0) % 24;
        const mins = (parts[1] || 0) % 60;
        const secs = (parts[2] || 0) % 60;
        return hrs * 3600 + mins * 60 + secs;
      }
      return this.getNowSecondsOfDay();
    } catch {
      return this.getNowSecondsOfDay();
    }
  }

  private parseTimeDiff(departure: string, arrival: string): number {
    const toSeconds = (t: string): number => {
      const parts = t.split(':').map(Number);
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    };
    return toSeconds(arrival) - toSeconds(departure);
  }

  private getNowSecondsOfDay(): number {
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(Date.now() + istOffsetMs);
    return (
      istDate.getUTCHours() * 3600 +
      istDate.getUTCMinutes() * 60 +
      istDate.getUTCSeconds()
    );
  }

  async planJourney(query: JourneyQueryDto): Promise<JourneyResponse> {
    const { from: fromId, to: toId } = query;
    const k = query.k ?? DEFAULT_K;

    const constraints: GenericConstraints = {
      mobility: query.mobility,
      luggage: query.luggage,
      avoid: Array.isArray(query.avoid)
        ? query.avoid
        : query.avoid
          ? [query.avoid]
          : [],
      prefer: Array.isArray(query.prefer)
        ? query.prefer
        : query.prefer
          ? [query.prefer]
          : [],
      objective: query.objective,
    };

    if (fromId === toId) {
      throw new BadRequestException(
        'Origin and destination must be different locations.',
      );
    }

    // ── 1. Load endpoint resolution (Stations or Multimodal Landmarks) ───────
    const [fromEndpoint, toEndpoint] = await Promise.all([
      this.resolveEndpoint(fromId),
      this.resolveEndpoint(toId),
    ]);

    if (!fromEndpoint)
      throw new NotFoundException(`Origin location not found: ${fromId}`);
    if (!toEndpoint)
      throw new NotFoundException(`Destination location not found: ${toId}`);

    if (fromEndpoint.systemId !== toEndpoint.systemId) {
      throw new BadRequestException(
        'Cross-system routing is not supported. Both locations must belong to the same metro system.',
      );
    }

    const systemId = fromEndpoint.systemId;
    const systemCode = fromEndpoint.systemCode;

    // ── 2. Get transit graph (cache-first) ───────────────────────────────────
    const graph = await this.graphProvider.get(systemId, systemCode);

    // ── 3. Multi-Leg Origin/Destination Graph Attachment ─────────────────────
    // Decouples greedy pre-snapping: evaluates all candidate feeder stations
    // across origin and destination attachments rather than prematurely locking to one gate.
    const weights = DEFAULT_WEIGHTS;
    const candidatePathsWithEndpoints: Array<{
      path: GraphEdge[];
      originAttachment: ResolvedGateAttachment;
      destAttachment: ResolvedGateAttachment;
    }> = [];

    // When origin or destination has multiple attachment stations (e.g. localities/POIs),
    // corridor diversity is already established across the different attachment station pairs.
    // Setting kPerPair = 1 yields the optimal shortest path for each feeder pair without
    // the combinatorial explosion of running Yen's deviation loops across all combinations.
    const isMultiAttachment =
      fromEndpoint.attachments.length > 1 || toEndpoint.attachments.length > 1;
    const kPerPair = isMultiAttachment ? 1 : k;

    for (const origAtt of fromEndpoint.attachments) {
      for (const destAtt of toEndpoint.attachments) {
        if (origAtt.station.id === destAtt.station.id) {
          continue;
        }

        const rawPaths = this.router.solveKShortest(
          graph,
          origAtt.station.id,
          destAtt.station.id,
          weights,
          kPerPair,
        );

        for (const p of rawPaths) {
          candidatePathsWithEndpoints.push({
            path: p,
            originAttachment: origAtt,
            destAttachment: destAtt,
          });
        }
      }
    }

    if (candidatePathsWithEndpoints.length === 0) {
      throw new NotFoundException(
        `No route found between ${fromEndpoint.name} and ${toEndpoint.name}.`,
      );
    }

    // ── 4. Batch query lines & stations across all paths ─────────────────────
    const allLineIds = [
      ...new Set(
        candidatePathsWithEndpoints.flatMap((item) =>
          item.path.map((e) => e.lineId).filter(Boolean),
        ),
      ),
    ] as string[];

    const lines =
      allLineIds.length > 0
        ? await this.db.line.findMany({
            where: { id: { in: allLineIds } },
            select: { id: true, name: true, color: true, code: true },
          })
        : [];
    const normalizedLines = lines.map((l) => ({
      ...l,
      color: this.resolveLineColor(l),
    }));
    const lineMap = new Map(normalizedLines.map((l) => [l.id, l]));

    const allStationIds = [
      ...new Set(
        candidatePathsWithEndpoints.flatMap((item) =>
          this.extractStationIds(item.path, item.originAttachment.station.id),
        ),
      ),
    ];
    const stationDetails = await this.db.station.findMany({
      where: { id: { in: allStationIds } },
      select: {
        id: true,
        code: true,
        name: true,
        latitude: true,
        longitude: true,
      },
    });
    const stationMap = new Map(stationDetails.map((s) => [s.id, s]));

    // ── 5. Priority 1 (Item 3): Time-Dependent Routing & Connection Risk Buffers ──
    // Formula: Interchange Cost = T_walk + (T_next_dep - T_platform_arrival)
    // Safety Buffer: Earliest feasible departure = T_platform_arrival + T_walk + B_safety
    const safetyBufferSeconds = query.safetyBufferMins
      ? query.safetyBufferMins * 60
      : constraints.mobility === 'REDUCED' || constraints.luggage === 'HEAVY'
        ? 300
        : 180;

    const baseDepartureSecs = this.parseDepartureTimeToSeconds(
      query.departureTime,
    );
    const enriched: EnrichedCandidate[] = [];
    const candidateOriginalPaths = new Map<string, GraphEdge[]>();

    for (const {
      path,
      originAttachment,
      destAttachment,
    } of candidatePathsWithEndpoints) {
      const journeyScore = this.scorer.score(
        path,
        weights,
        (previous, current) => {
          const previousCode = previous.lineId
            ? lineMap.get(previous.lineId)?.code
            : null;
          const currentCode = current.lineId
            ? lineMap.get(current.lineId)?.code
            : null;
          const stationCode = graph.nodes.get(current.from)?.code;
          return (
            previous.to === current.from &&
            this.interchangeEvaluator.isThroughRunningTransition(
              previousCode,
              currentCode,
              stationCode,
            )
          );
        },
      );

      const stationIds = this.extractStationIds(
        path,
        originAttachment.station.id,
      );
      const orderedStations: StationRef[] = stationIds.map((id) => {
        const node = graph.nodes.get(id);
        const detail = stationMap.get(id);
        return {
          id,
          name: detail?.name ?? node?.name ?? id,
          code: detail?.code ?? node?.code ?? '',
          lat: detail?.latitude ?? node?.lat ?? 0,
          lng: detail?.longitude ?? node?.lng ?? 0,
        };
      });

      const legs = await this.buildLegs(path, lineMap, stationMap, false);

      // ── Attach First-Mile Leg if origin is a landmark with direct FOB / access ──
      if (
        fromEndpoint.landmark &&
        (fromEndpoint.landmark.hasDirectFob || fromEndpoint.landmark.hasDirectAccess) &&
        (originAttachment.gate.walkTimeSeconds > 0 ||
          originAttachment.gate.walkDistanceMeters > 0 ||
          originAttachment.gate.corridorNote)
      ) {
        const accessWalkMins = Math.max(
          1,
          Math.round(originAttachment.gate.walkTimeSeconds / 60),
        );
        const accessLeg: JourneyLeg = {
          mode: 'TRANSFER',
          type: EdgeType.WALK,
          from: fromEndpoint.landmark.id,
          fromStationName: fromEndpoint.landmark.name,
          to: originAttachment.station.id,
          toStationName: originAttachment.station.name,
          duration: originAttachment.gate.walkTimeSeconds,
          durationSeconds: originAttachment.gate.walkTimeSeconds,
          durationMinutes: accessWalkMins,
          lineId: null,
          lineName: null,
          lineColor: null,
          lineCode: null,
          hopCount: 1,
          visitedStationCount: 2,
          stationsCount: 1,
          stopsCount: 1,
          stopsText:
            originAttachment.gate.corridorType === 'TRAVELATOR'
              ? 'Travelator Walkway'
              : 'Access Walkway',
          transferTitle: originAttachment.gate.gateName,
          transferSummary: `${originAttachment.gate.walkDistanceMeters} m · ${
            originAttachment.gate.corridorType === 'TRAVELATOR'
              ? 'Travelator Walkway'
              : 'Pedestrian Walkway'
          }`,
          transferDurationText: `~${accessWalkMins} min`,
          transferInstructions: [
            `Depart ${fromEndpoint.landmark.name} via ${originAttachment.gate.gateName}`,
            originAttachment.gate.corridorNote ||
              `Proceed to ${originAttachment.station.name} station concourse`,
          ],
          platformStatus: 'UNKNOWN',
          doorSideStatus: 'UNKNOWN_SOURCE_REQUIRED',
        };
        legs.unshift(accessLeg);
      }

      // ── Attach Last-Mile Leg if destination is a landmark with direct FOB / access ──
      if (
        toEndpoint.landmark &&
        (toEndpoint.landmark.hasDirectFob || toEndpoint.landmark.hasDirectAccess) &&
        (destAttachment.gate.walkTimeSeconds > 0 ||
          destAttachment.gate.walkDistanceMeters > 0 ||
          destAttachment.gate.corridorNote)
      ) {
        const egressWalkMins = Math.max(
          1,
          Math.round(destAttachment.gate.walkTimeSeconds / 60),
        );
        const egressLeg: JourneyLeg = {
          mode: 'TRANSFER',
          type: EdgeType.WALK,
          from: destAttachment.station.id,
          fromStationName: destAttachment.station.name,
          to: toEndpoint.landmark.id,
          toStationName: toEndpoint.landmark.name,
          duration: destAttachment.gate.walkTimeSeconds,
          durationSeconds: destAttachment.gate.walkTimeSeconds,
          durationMinutes: egressWalkMins,
          lineId: null,
          lineName: null,
          lineColor: null,
          lineCode: null,
          hopCount: 1,
          visitedStationCount: 2,
          stationsCount: 1,
          stopsCount: 1,
          stopsText:
            destAttachment.gate.corridorType === 'TRAVELATOR'
              ? 'Travelator Walkway'
              : 'Concourse Egress',
          transferTitle: destAttachment.gate.gateName,
          transferSummary: `${destAttachment.gate.walkDistanceMeters} m · ${
            destAttachment.gate.corridorType === 'TRAVELATOR'
              ? 'Travelator Walkway'
              : 'Pedestrian Walkway'
          }`,
          transferDurationText: `~${egressWalkMins} min`,
          transferInstructions: [
            `Exit ${destAttachment.station.name} via ${destAttachment.gate.gateName}`,
            destAttachment.gate.corridorNote ||
              `Direct connection into ${toEndpoint.landmark.name}`,
          ],
          platformStatus: 'UNKNOWN',
          doorSideStatus: 'UNKNOWN_SOURCE_REQUIRED',
        };
        legs.push(egressLeg);
      }

      // ── Fast In-Memory Interchange & Safety Buffer Estimation ─────────
      let initialWaitSeconds = 120;
      let totalTransferWaitSeconds = 0;
      let hasFirstTransitBoarded = false;

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (leg.type === EdgeType.TRANSIT) {
          if (!hasFirstTransitBoarded) {
            hasFirstTransitBoarded = true;
          }
        } else if (
          leg.type === EdgeType.WALK ||
          leg.type === EdgeType.TRANSFER
        ) {
          if (hasFirstTransitBoarded) {
            totalTransferWaitSeconds += Math.max(120, safetyBufferSeconds);
          }
        }
      }

      const walkingSeconds = legs
        .filter((l) => l.type === EdgeType.WALK || l.type === EdgeType.TRANSFER)
        .reduce((sum, l) => sum + l.durationSeconds, 0);

      const inVehicleSeconds = legs
        .filter((l) => l.type === EdgeType.TRANSIT)
        .reduce((sum, l) => sum + l.durationSeconds, 0);

      const waiting: WaitingBreakdown = {
        total: {
          seconds: initialWaitSeconds + totalTransferWaitSeconds,
          source: 'schedule',
          confidence: 0.85,
        },
        initialWait: {
          seconds: initialWaitSeconds,
          source: 'schedule',
          confidence: 0.85,
        },
        transferWait: {
          seconds: totalTransferWaitSeconds,
          source: 'schedule',
          confidence: 0.85,
        },
      };

      const totalPathwayMeters = legs.reduce((sum, leg, index) => {
        if (leg.type === EdgeType.WALK || leg.type === EdgeType.TRANSFER) {
          const meters =
            leg.transferDetails?.pathwayDistanceMeters ??
            Math.max(60, Math.round(leg.durationSeconds * 1.2));
          return sum + meters;
        }
        const next = legs[index + 1];
        const hasSeparateWalkLeg =
          next?.type === EdgeType.WALK || next?.type === EdgeType.TRANSFER;
        const isLineChange =
          next?.type === EdgeType.TRANSIT &&
          next.lineId !== leg.lineId &&
          !next.throughServiceContinuationFromPrevious;
        return (
          sum +
          (!hasSeparateWalkLeg && isLineChange
            ? (leg.transferDetails?.pathwayDistanceMeters ?? 120)
            : 0)
        );
      }, 0);

      const totalDurationSeconds =
        inVehicleSeconds + walkingSeconds + waiting.total.seconds;

      const isDirect = journeyScore.transfers === 0;
      const lineNames = [
        ...new Set(
          path
            .filter((e) => e.type === EdgeType.TRANSIT && e.lineId)
            .map((e) => lineMap.get(e.lineId!)?.name ?? e.lineId!),
        ),
      ];

      const id = `${originAttachment.gate.gateId}>${candidateId(path)}>${destAttachment.gate.gateId}`;
      const rankScore = this.scorer.rankScore(
        totalDurationSeconds,
        journeyScore.transfers,
        walkingSeconds,
      );

      const firstStation = orderedStations[0] || {
        id: originAttachment.station.id,
        name: originAttachment.station.name,
        code: originAttachment.station.code,
        lat: originAttachment.station.latitude,
        lng: originAttachment.station.longitude,
      };
      const lastStation = orderedStations[orderedStations.length - 1] || {
        id: destAttachment.station.id,
        name: destAttachment.station.name,
        code: destAttachment.station.code,
        lat: destAttachment.station.latitude,
        lng: destAttachment.station.longitude,
      };

      let destinationGuidance: string | null = null;
      if (
        toEndpoint.landmark &&
        (toEndpoint.landmark.hasDirectFob || toEndpoint.landmark.hasDirectAccess)
      ) {
        destinationGuidance = destAttachment.gate?.gateName
          ? `Exit ${destAttachment.gate.gateName} for ${toEndpoint.landmark.name}`
          : `Exit for ${toEndpoint.landmark.name}`;
      } else if (
        destAttachment.gate?.corridorType === 'FOB' ||
        destAttachment.gate?.corridorType === 'TRAVELATOR'
      ) {
        destinationGuidance = destAttachment.gate.corridorNote || null;
      }

      const fareDetails = computeJourneyFares(legs);

      const originRef: StationRef =
        fromEndpoint.landmark &&
        (fromEndpoint.landmark.hasDirectFob || fromEndpoint.landmark.hasDirectAccess)
          ? {
              id: fromEndpoint.landmark.id,
              name: fromEndpoint.landmark.name,
              code: fromEndpoint.code,
              lat: fromEndpoint.latitude,
              lng: fromEndpoint.longitude,
            }
          : firstStation;

      const destRef: StationRef =
        toEndpoint.landmark &&
        (toEndpoint.landmark.hasDirectFob || toEndpoint.landmark.hasDirectAccess)
          ? {
              id: toEndpoint.landmark.id,
              name: toEndpoint.landmark.name,
              code: toEndpoint.code,
              lat: toEndpoint.latitude,
              lng: toEndpoint.longitude,
            }
          : lastStation;

      candidateOriginalPaths.set(id, path);

      const candidateObj: EnrichedCandidate = {
        id,
        rank: 0,
        score: journeyScore.score,
        origin: originRef,
        destination: destRef,
        durationSeconds: totalDurationSeconds,
        durationMinutes: Math.round(totalDurationSeconds / 60),
        duration: Math.round(totalDurationSeconds / 60),
        inVehicleSeconds,
        walkingSeconds,
        waiting,
        transfers: journeyScore.transfers,
        walkingDistanceMeters: totalPathwayMeters,
        legs,
        stations: orderedStations,
        geojson: { type: 'FeatureCollection', features: [] },
        isDirect,
        lines: lineNames,
        fare: fareDetails.totalPaperFare,
        smartCardFare: fareDetails.totalSmartCardFare,
        fareBreakdown: fareDetails.breakdown,
        requiresMultipleTickets: fareDetails.requiresMultipleTickets,
        realtime: null,
        confidence: 0.85,
        transferSafetyBufferSeconds: safetyBufferSeconds,
        transferRiskLevel: safetyBufferSeconds >= 300 ? 'BUFFERED' : 'SAFE',
        tradeoffs: {
          durationDeltaSeconds: 0,
          transferDelta: 0,
          walkingDeltaMeters: 0,
        },
        attributes: {
          fastest: false,
          fewestTransfers: false,
          direct: false,
          leastWalking: false,
          accessibilityFriendly: false,
        } satisfies CandidateAttributes,
        destinationGuidance,
        _rankScore: rankScore,
        destFeederDistanceMeters: destAttachment.gate.walkDistanceMeters,
      } as EnrichedCandidate & { destFeederDistanceMeters?: number };

      // ── ICX Evaluation ────────────────────────────────────────────────────
      const evalResult = this.interchangeEvaluator.evaluateCandidate(
        candidateObj,
        constraints,
      );
      candidateObj.interchangeFriction = {
        level: evalResult.frictionLevel,
        effectiveCostSeconds: evalResult.effectiveCostSeconds,
        frictionSeconds: evalResult.frictionSeconds,
      };
      candidateObj.reasonCodes = evalResult.reasonCodes;
      candidateObj.humanSummary = evalResult.humanSummary;

      // ── Landmark Intelligence ─────────────────────────────────────────────
      if (toEndpoint.landmark) {
        candidateObj.destinationLandmark = {
          id: toEndpoint.landmark.id,
          name: toEndpoint.landmark.name,
          category: toEndpoint.landmark.category || 'COMMERCIAL',
          hasDirectFob: Boolean(toEndpoint.landmark.hasDirectFob),
          hasDirectAccess: Boolean(toEndpoint.landmark.hasDirectAccess),
          directFobName: toEndpoint.landmark.directFobName,
          walkDistanceMeters: destAttachment.gate.walkDistanceMeters,
          walkTimeSeconds: destAttachment.gate.walkTimeSeconds,
          corridorNote: destAttachment.gate.corridorNote,
          indoorLevel: destAttachment.gate.indoorLevel,
        };
        candidateObj.destinationGuidance = destAttachment.gate.corridorNote;
      } else if (destAttachment.gate?.corridorNote) {
        candidateObj.destinationGuidance = destAttachment.gate.corridorNote;
      }

      if (fromEndpoint.landmark) {
        candidateObj.originLandmark = {
          id: fromEndpoint.landmark.id,
          name: fromEndpoint.landmark.name,
          category: fromEndpoint.landmark.category || 'COMMERCIAL',
          hasDirectFob: Boolean(fromEndpoint.landmark.hasDirectFob),
          hasDirectAccess: Boolean(fromEndpoint.landmark.hasDirectAccess),
          directFobName: fromEndpoint.landmark.directFobName,
          walkDistanceMeters: originAttachment.gate.walkDistanceMeters,
          walkTimeSeconds: originAttachment.gate.walkTimeSeconds,
          corridorNote: originAttachment.gate.corridorNote,
          indoorLevel: originAttachment.gate.indoorLevel,
        };
      }

      if (candidateObj.destinationLandmark?.hasDirectFob) {
        const fobNotice = `${candidateObj.destinationLandmark.name} is directly connected via FOB to ${destAttachment.station.name}. Zero street walking required.`;
        candidateObj.humanSummary = candidateObj.humanSummary
          ? `${candidateObj.humanSummary} • ${fobNotice}`
          : fobNotice;
      }

      if (evalResult.isFeasible) {
        enriched.push(candidateObj);
      }
    }

    // ── 6. Feasibility + dominance filter ────────────────────────────────────
    const filtered = this.filter.filter(enriched);

    if (filtered.length === 0) {
      if (enriched.length > 0) {
        this.logger.warn(
          `All candidate routes were pruned by filter; falling back to best enriched candidate between ${fromEndpoint.name} and ${toEndpoint.name}.`,
        );
        filtered.push(enriched[0]);
      } else {
        throw new NotFoundException(
          `No route found between ${fromEndpoint.name} and ${toEndpoint.name}.`,
        );
      }
    }

    // ── 7. Deterministic Rank: sort by effectiveCost if friction/luggage requested, else rankScore ──
    const sortByFriction =
      constraints.objective === 'MIN_FRICTION' ||
      constraints.luggage === 'HEAVY';

    if (sortByFriction) {
      filtered.sort(
        (a, b) =>
          (a.interchangeFriction?.effectiveCostSeconds ?? a._rankScore) -
          (b.interchangeFriction?.effectiveCostSeconds ?? b._rankScore),
      );
    } else {
      filtered.sort((a, b) => a._rankScore - b._rankScore);
    }

    // ── 7b. Locality Multi-Corridor & Divide-Crossing Re-Ranking ─────────────
    // When destination is a locality/coordinates with multiple candidate feeder stations
    // across different metro lines (e.g. Irla having Andheri L1, Andheri West L2A, Gundavali L7):
    // 1. Identify which candidate reaches the feeder station closest to the destination locality.
    // 2. In Mumbai, the Western Railway corridor (longitude ~72.851) divides the Western suburbs
    //    (Line 2A, SV Road, Irla, Juhu) from the Eastern highway corridor (Line 7, WEH).
    // 3. If a commuter originates in the East (e.g. Thakur Village on Line 7) heading to a West locality (Irla):
    //    - Candidate A (L7 -> L1) uses the metro to cross the railway barrier and deboards at Andheri L1 (closest station).
    //    - Candidate B (L7 direct) stops at Gundavali in the East, leaving the passenger to fight road traffic across the tracks.
    //    Commuters explicitly prefer taking the metro across the tracks (Candidate 1: L7 -> L1) over deboarding
    //    in the East (Candidate 2: L7 direct to Gundavali).
    // 4. Conversely, if origin and destination are already on the same side (e.g. Borivali West on L2A to Irla),
    //    the direct run on the origin line remains Candidate 1, and the transfer route is Candidate 2.
    if (toEndpoint.attachments.length > 1 && filtered.length > 1) {
      const getDestDistance = (c: EnrichedCandidate): number => {
        const att = toEndpoint.attachments.find(
          (a) => a.station.id === c.destination.id,
        );
        return att ? att.gate.walkDistanceMeters : 99999;
      };

      const minDestDist = Math.min(...filtered.map(getDestDistance));
      const RAILWAY_DIVIDE_LNG = 72.851;
      const isDestWest = toEndpoint.longitude < RAILWAY_DIVIDE_LNG;

      filtered.sort((a, b) => {
        const distA = getDestDistance(a);
        const distB = getDestDistance(b);
        const aIsClosest = distA <= minDestDist + 150;
        const bIsClosest = distB <= minDestDist + 150;

        const aDestLng = a.destination.lng ?? 72.851;
        const bDestLng = b.destination.lng ?? 72.851;
        const aOnDestSide = (aDestLng < RAILWAY_DIVIDE_LNG) === isDestWest;
        const bOnDestSide = (bDestLng < RAILWAY_DIVIDE_LNG) === isDestWest;

        // If candidate 'a' reaches the destination side of the railway divide AND deboards at the closest station,
        // while candidate 'b' terminates on the opposite side of the railway divide, candidate 'a' takes precedence.
        if (aOnDestSide && !bOnDestSide && aIsClosest) {
          return -1;
        }
        if (bOnDestSide && !aOnDestSide && bIsClosest) {
          return 1;
        }

        // Otherwise maintain the standard rankScore / friction sort
        return sortByFriction
          ? (a.interchangeFriction?.effectiveCostSeconds ?? a._rankScore) -
              (b.interchangeFriction?.effectiveCostSeconds ?? b._rankScore)
          : a._rankScore - b._rankScore;
      });
    }

    // Retain top surviving candidates up to requested k (default 3)
    const maxSurviving = Math.max(1, k || 3);
    const topCandidates = filtered.slice(0, maxSurviving);

    // ── 8. Enrich top candidates with realtime departures, platforms, & GeoJSON ──
    for (const candidate of topCandidates) {
      // Finalize transit legs with deterministic direction and platform
      for (let i = 0; i < candidate.legs.length; i++) {
        const prev = i > 0 ? candidate.legs[i - 1] : null;
        const next = i < candidate.legs.length - 1 ? candidate.legs[i + 1] : null;
        await this.finalizeLeg(candidate.legs[i], prev, next, stationMap, lineMap);
      }

      // Realtime departure & connection simulation
      let currentClockSecs = baseDepartureSecs;
      let initialWaitSeconds = 120;
      let totalTransferWaitSeconds = 0;
      let hasFirstTransitBoarded = false;
      let platformArrivalSecs = currentClockSecs;

      for (let i = 0; i < candidate.legs.length; i++) {
        const leg = candidate.legs[i];
        if (leg.type === EdgeType.TRANSIT) {
          if (!hasFirstTransitBoarded) {
            hasFirstTransitBoarded = true;
            const originDep =
              await this.realtimePrediction.predictTransitDeparture(
                leg.from,
                leg.lineId,
                leg.towards,
                currentClockSecs,
                currentClockSecs,
              );
            initialWaitSeconds = Math.max(
              60,
              originDep.actualDepartureSecs - currentClockSecs,
            );
            currentClockSecs =
              originDep.actualDepartureSecs + leg.durationSeconds;
            platformArrivalSecs = currentClockSecs;
            leg.connectionWaitMins = 0;
            leg.realtimeEtaMins = originDep.realtimeEtaMins;
            leg.realtimeTimeStr = originDep.realtimeTimeStr;
          } else if (leg.throughServiceContinuationFromPrevious) {
            currentClockSecs += leg.durationSeconds;
            platformArrivalSecs = currentClockSecs;
          } else {
            currentClockSecs += leg.durationSeconds;
            platformArrivalSecs = currentClockSecs;
          }
        } else if (
          leg.type === EdgeType.WALK ||
          leg.type === EdgeType.TRANSFER
        ) {
          if (!hasFirstTransitBoarded) {
            currentClockSecs += leg.durationSeconds;
          } else {
            const walkSecs = leg.durationSeconds;
            const connectingPlatformArrival = platformArrivalSecs + walkSecs;
            const earliestFeasibleDep =
              connectingPlatformArrival + safetyBufferSeconds;

            const nextTransitLeg = candidate.legs[i + 1];
            const connectingPrediction =
              await this.realtimePrediction.predictTransitDeparture(
                leg.to,
                nextTransitLeg?.lineId ?? null,
                nextTransitLeg?.towards ?? null,
                earliestFeasibleDep,
                this.getNowSecondsOfDay(),
              );

            const actualConnectingDep = Math.max(
              earliestFeasibleDep,
              connectingPrediction.actualDepartureSecs,
            );
            const waitSecs = actualConnectingDep - connectingPlatformArrival;
            totalTransferWaitSeconds += waitSecs;

            const waitMins = Math.max(1, Math.round(waitSecs / 60));
            const walkMins = Math.max(1, Math.round(walkSecs / 60));
            const pathwayMeters =
              leg.transferDetails?.pathwayDistanceMeters ??
              Math.max(60, Math.round(walkSecs * 1.2));

            leg.connectionWaitMins = waitMins;
            leg.transferDurationText = `${walkMins} min transfer · Next train ${connectingPrediction.realtimeTimeStr}`;
            leg.transferSummary = `${pathwayMeters} m · ${walkMins} min transfer · Next train ${connectingPrediction.realtimeTimeStr}`;

            if (nextTransitLeg && nextTransitLeg.type === EdgeType.TRANSIT) {
              const nowSecs = this.getNowSecondsOfDay();
              const minsFromNow = Math.max(
                1,
                Math.round((actualConnectingDep - nowSecs) / 60),
              );
              nextTransitLeg.realtimeTimeStr =
                connectingPrediction.realtimeTimeStr;
              nextTransitLeg.realtimeEtaMins = minsFromNow;
              nextTransitLeg.connectionWaitMins = waitMins;
              nextTransitLeg.delaySeconds = connectingPrediction.delaySeconds;
            }

            currentClockSecs = actualConnectingDep;
          }
        }
      }

      candidate.waiting = {
        total: {
          seconds: initialWaitSeconds + totalTransferWaitSeconds,
          source: 'schedule',
          confidence: 0.85,
        },
        initialWait: {
          seconds: initialWaitSeconds,
          source: 'schedule',
          confidence: 0.85,
        },
        transferWait: {
          seconds: totalTransferWaitSeconds,
          source: 'schedule',
          confidence: 0.85,
        },
      };

      const inVehSecs = candidate.legs
        .filter((l) => l.type === EdgeType.TRANSIT)
        .reduce((sum, l) => sum + l.durationSeconds, 0);
      const walkSecs = candidate.legs
        .filter((l) => l.type === EdgeType.WALK || l.type === EdgeType.TRANSFER)
        .reduce((sum, l) => sum + l.durationSeconds, 0);

      candidate.inVehicleSeconds = inVehSecs;
      candidate.walkingSeconds = walkSecs;
      candidate.durationSeconds =
        inVehSecs + walkSecs + candidate.waiting.total.seconds;
      candidate.durationMinutes = Math.round(candidate.durationSeconds / 60);
      candidate.duration = candidate.durationMinutes;

      const firstTransitLeg = candidate.legs.find((l) => l.type === EdgeType.TRANSIT);
      const originStationId = firstTransitLeg?.from || candidate.origin.id;
      const originLineId = firstTransitLeg?.lineId || '';

      candidate.realtime = await this.realtimePrediction.predictJourneyTrains(
        originStationId,
        originLineId,
      );

      const origPath = candidateOriginalPaths.get(candidate.id) || [];
      candidate.geojson = await this.buildGeoJson(
        candidate.stations,
        candidate.legs,
        origPath,
        stationMap,
        lineMap,
      );
    }

    topCandidates.forEach((c, i) => {
      c.rank = i + 1;
    });

    // ── 9. Attribute flags + tradeoffs ────────────────────────────────────────
    this.scorer.computeAttributes(topCandidates);
    this.scorer.computeTradeoffs(topCandidates);

    this.logger.log(
      `Journey planned: ${fromEndpoint.name} → ${toEndpoint.name}, ` +
        `${topCandidates.length} candidates (from ${candidatePathsWithEndpoints.length} raw paths)`,
    );

    // ── 10. Build response ─────────────────────────────────────────────────────
    const fromRef: StationRef = {
      id: fromEndpoint.id,
      name: fromEndpoint.name,
      code: fromEndpoint.code,
      lat: fromEndpoint.latitude,
      lng: fromEndpoint.longitude,
    };
    const toRef: StationRef = {
      id: toEndpoint.id,
      name: toEndpoint.name,
      code: toEndpoint.code,
      lat: toEndpoint.latitude,
      lng: toEndpoint.longitude,
    };

    // Strip internal fields before returning
    const candidates: RouteCandidate[] = topCandidates.map((c) => {
      delete (c as { _rankScore?: number })._rankScore;
      return c;
    });

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        algorithm: 'yen-k-shortest',
        graphVersion: this.GRAPH_VERSION,
        candidateCount: candidates.length,
        from: fromRef,
        to: toRef,
      },
      candidates,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private extractStationIds(
    path: { from: string; to: string }[],
    origin: string,
  ): string[] {
    const ids: string[] = [origin];
    for (const edge of path) {
      if (ids[ids.length - 1] !== edge.to) {
        ids.push(edge.to);
      }
    }
    return [...new Set(ids)];
  }

  private async buildLegs(
    path: GraphEdge[],
    lineMap: Map<
      string,
      { id: string; name: string | null; color: string; code: string | null }
    >,
    stationMap: Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        latitude: number;
        longitude: number;
      }
    >,
    shouldFinalize = true,
  ): Promise<JourneyLeg[]> {
    const legs: JourneyLeg[] = [];
    let currentLeg: JourneyLeg | null = null;
    let previousTransit: { lineCode: string | null; to: string } | null = null;

    for (const edge of path) {
      const line = edge.lineId ? lineMap.get(edge.lineId) : undefined;
      const fromSt = stationMap.get(edge.from);
      const toSt = stationMap.get(edge.to);
      const fromName = fromSt?.name ?? edge.from;
      const toName = toSt?.name ?? edge.to;
      const fromRef: StationRef = {
        id: edge.from,
        name: fromName,
        code: fromSt?.code ?? '',
        lat: fromSt?.latitude ?? 0,
        lng: fromSt?.longitude ?? 0,
      };
      const toRef: StationRef = {
        id: edge.to,
        name: toName,
        code: toSt?.code ?? '',
        lat: toSt?.latitude ?? 0,
        lng: toSt?.longitude ?? 0,
      };
      const legMode: LegMode =
        edge.type === EdgeType.TRANSIT ? 'METRO' : 'TRANSFER';
      const edgeDist =
        fromSt && toSt
          ? getDistanceMeters(
              fromSt.latitude,
              fromSt.longitude,
              toSt.latitude,
              toSt.longitude,
            )
          : 0;
      const throughServiceContinuationFromPrevious = Boolean(
        edge.type === EdgeType.TRANSIT &&
        previousTransit?.to === edge.from &&
        this.interchangeEvaluator.isThroughRunningTransition(
          previousTransit?.lineCode,
          line?.code,
          fromRef.code,
        ),
      );

      if (
        currentLeg !== null &&
        currentLeg.type === edge.type &&
        (currentLeg.lineId === (edge.lineId ?? null) ||
          throughServiceContinuationFromPrevious)
      ) {
        if (throughServiceContinuationFromPrevious && edge.lineId) {
          currentLeg.lineId = edge.lineId;
          if (line?.name) currentLeg.lineName = line.name;
          if (line?.color) currentLeg.lineColor = line.color;
          if (line?.code) currentLeg.lineCode = line.code;
        }
        currentLeg.to = edge.to;
        currentLeg.toStationName = toName;
        currentLeg.toStation = toRef;
        currentLeg.duration += edge.duration;
        currentLeg.durationSeconds = currentLeg.duration;
        currentLeg.durationMinutes = Math.max(
          1,
          Math.round(currentLeg.duration / 60),
        );
        currentLeg.distanceMeters = (currentLeg.distanceMeters || 0) + edgeDist;
        currentLeg.hopCount += 1;
        currentLeg.stationsCount = currentLeg.hopCount;
        currentLeg.stopsCount = currentLeg.hopCount;
        currentLeg.visitedStationCount = currentLeg.hopCount + 1;
        currentLeg.stopsText =
          currentLeg.mode === 'METRO'
            ? currentLeg.hopCount === 1
              ? 'Ride 1 stop'
              : `Ride ${currentLeg.hopCount} stops`
            : 'Transfer';
      } else {
        if (currentLeg) legs.push(currentLeg);
        currentLeg = {
          mode: legMode,
          from: edge.from,
          fromStationName: fromName,
          fromStation: fromRef,
          to: edge.to,
          toStationName: toName,
          toStation: toRef,
          type: edge.type,
          duration: edge.duration,
          durationSeconds: edge.duration,
          durationMinutes: Math.max(1, Math.round(edge.duration / 60)),
          distanceMeters: edgeDist,
          lineId: edge.lineId ?? null,
          lineName: line?.name ?? null,
          lineColor: line?.color ?? null,
          lineCode: line?.code ?? null,
          hopCount: 1,
          visitedStationCount: 2,
          stationsCount: 1,
          stopsCount: 1,
          stopsText: legMode === 'METRO' ? 'Ride 1 stop' : 'Transfer',
          platformStatus: 'UNKNOWN',
          doorSideStatus: 'UNKNOWN_SOURCE_REQUIRED',
          ...(throughServiceContinuationFromPrevious
            ? { throughServiceContinuationFromPrevious: true }
            : {}),
        };
      }

      previousTransit =
        edge.type === EdgeType.TRANSIT
          ? { lineCode: line?.code ?? null, to: edge.to }
          : null;
    }
    if (currentLeg) {
      legs.push(currentLeg);
    }
    for (let i = 0; i < legs.length; i++) {
      const prev = i > 0 ? legs[i - 1] : null;
      const next = i < legs.length - 1 ? legs[i + 1] : null;
      if (shouldFinalize) {
        await this.finalizeLeg(legs[i], prev, next, stationMap, lineMap);
      } else if (
        legs[i].type === EdgeType.WALK ||
        legs[i].type === EdgeType.TRANSFER
      ) {
        const transfer = this.interchangeEvaluator.resolveTransferDetails(
          legs[i].fromStationName,
          legs[i].toStationName,
          prev?.lineName,
          next?.lineName,
          legs[i].fromStation?.code,
          legs[i].toStation?.code,
        );
        if (transfer) {
          legs[i].transferDetails = transfer;
          legs[i].transferTitle = transfer.name;
          legs[i].transferDurationText = transfer.durationDisplay;
          legs[i].transferInstructions = transfer.instructions;
          if (transfer.estimatedDurationSeconds !== null) {
            legs[i].duration = transfer.estimatedDurationSeconds;
            legs[i].durationSeconds = transfer.estimatedDurationSeconds;
            legs[i].durationMinutes = Math.max(
              1,
              Math.round(transfer.estimatedDurationSeconds / 60),
            );
          }
          legs[i].transferSummary =
            transfer.pathwayDistanceMeters !== null
              ? `${transfer.pathwayDistanceMeters} m · ${transfer.durationDisplay}`
              : transfer.durationDisplay;
        }
      }
    }
    return legs;
  }

  private ctmLine9Cache: Phase1CtmData | null = null;
  private ctmLine2bCache: Phase1CtmData | null = null;

  private loadCtmLine9(): Phase1CtmData | null {
    if (this.ctmLine9Cache) return this.ctmLine9Cache;
    const candidates = [
      path.resolve(
        process.cwd(),
        'datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
      path.resolve(
        process.cwd(),
        '../../datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../../datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../datasets/mumbai/normalized/ctm-line9-phase1.json',
      ),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          this.ctmLine9Cache = parsePhase1Ctm(
            JSON.parse(fs.readFileSync(c, 'utf8')) as unknown,
          );
          return this.ctmLine9Cache;
        } catch {
          this.logger.warn(`Could not parse Line 9 CTM file: ${c}`);
        }
      }
    }
    return null;
  }

  private loadCtmLine2b(): Phase1CtmData | null {
    if (this.ctmLine2bCache) return this.ctmLine2bCache;
    const candidates = [
      path.resolve(
        process.cwd(),
        'datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
      path.resolve(
        process.cwd(),
        '../../datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../../datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
      path.resolve(
        __dirname,
        '../../../../datasets/mumbai/normalized/ctm-line2b-phase1.json',
      ),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          this.ctmLine2bCache = parsePhase1Ctm(
            JSON.parse(fs.readFileSync(c, 'utf8')) as unknown,
          );
          return this.ctmLine2bCache;
        } catch {
          this.logger.warn(`Could not parse Line 2B CTM file: ${c}`);
        }
      }
    }
    return null;
  }

  private async buildGeoJson(
    stations: StationRef[],
    legs: JourneyLeg[],
    path?: GraphEdge[],
    stationMap?: Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        latitude: number;
        longitude: number;
      }
    >,
    lineMap?: Map<
      string,
      { id: string; name: string | null; color: string; code: string | null }
    >,
  ): Promise<GeoJSON.FeatureCollection> {
    const features: GeoJSON.Feature[] = [];
    const coordMap = new Map<string, [number, number]>(
      stations.map((s) => [s.id, [s.lng, s.lat]]),
    );

    // Group path edges into contiguous corridor runs by (type, lineId)
    // to preserve distinct alignment geometry across through-running and CTM corridors
    const corridorRuns: Array<{
      type: EdgeType;
      lineId: string | null;
      from: string;
      to: string;
      lineName: string | null;
      lineColor: string;
    }> = [];

    if (path && path.length > 0 && stationMap) {
      let currentRun: (typeof corridorRuns)[0] | null = null;
      for (const edge of path) {
        const line =
          edge.lineId && lineMap ? lineMap.get(edge.lineId) : undefined;
        const color = line?.color ?? '#94a3b8';
        if (
          !currentRun ||
          currentRun.type !== edge.type ||
          currentRun.lineId !== (edge.lineId ?? null)
        ) {
          currentRun = {
            type: edge.type,
            lineId: edge.lineId ?? null,
            from: edge.from,
            to: edge.to,
            lineName: line?.name ?? null,
            lineColor: color,
          };
          corridorRuns.push(currentRun);
        } else {
          currentRun.to = edge.to;
        }
      }
    } else {
      for (const leg of legs) {
        corridorRuns.push({
          type: leg.type,
          lineId: leg.lineId,
          from: leg.from,
          to: leg.to,
          lineName: leg.lineName,
          lineColor: leg.lineColor ?? '#94a3b8',
        });
      }
    }

    const segments: Array<{
      coords: [number, number][];
      lineId: string | null;
      type: EdgeType;
      color: string;
      lineName: string | null;
    }> = [];

    for (const run of corridorRuns) {
      if (
        run.type !== EdgeType.TRANSIT &&
        run.type !== EdgeType.WALK &&
        run.type !== EdgeType.TRANSFER
      )
        continue;
      const fromSt = stationMap?.get(run.from);
      const toSt = stationMap?.get(run.to);
      const fromCoord =
        coordMap.get(run.from) ||
        (fromSt
          ? ([fromSt.longitude, fromSt.latitude] as [number, number])
          : null);
      const toCoord =
        coordMap.get(run.to) ||
        (toSt ? ([toSt.longitude, toSt.latitude] as [number, number]) : null);
      if (!fromCoord || !toCoord) continue;

      let segmentCoords: [number, number][] = [fromCoord, toCoord];

      if (run.type === EdgeType.TRANSIT && run.lineId) {
        const shapeCoords = await this.getShapeSegmentCoords(
          run.lineId,
          run.from,
          run.to,
          fromCoord,
          toCoord,
          lineMap,
        );
        if (shapeCoords && shapeCoords.length > 1) {
          segmentCoords = shapeCoords;
        }
      }

      const color = run.lineColor ?? '#94a3b8';
      // Keep each contiguous corridor run distinct. Color alone is not an
      // identity: separate corridors can share Yellow/Red branding, and a
      // same-color return segment must not be stitched across a transfer.
      segments.push({
        coords: segmentCoords,
        lineId: run.lineId,
        type: run.type,
        color,
        lineName: run.lineName,
      });
    }

    for (const seg of segments) {
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-segment',
          lineId: seg.lineId,
          lineName: seg.lineName,
          color: seg.color,
          mode: seg.type,
        },
        geometry: { type: 'LineString', coordinates: seg.coords },
      });
    }

    if (stations.length > 0) {
      const first = stations[0];
      const last = stations[stations.length - 1];
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-origin',
          name: first.name,
          code: first.code,
        },
        geometry: { type: 'Point', coordinates: [first.lng, first.lat] },
      });
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-destination',
          name: last.name,
          code: last.code,
        },
        geometry: { type: 'Point', coordinates: [last.lng, last.lat] },
      });
    }

    const transferStationIds = new Set<string>();
    for (let i = 1; i < legs.length; i++) {
      const prev = legs[i - 1];
      const curr = legs[i];
      if (
        prev.type === EdgeType.TRANSIT &&
        curr.type === EdgeType.TRANSIT &&
        !curr.throughServiceContinuationFromPrevious &&
        prev.lineId !== curr.lineId
      ) {
        transferStationIds.add(curr.from);
      } else if (
        curr.type === EdgeType.WALK &&
        i > 0 &&
        prev.type === EdgeType.TRANSIT &&
        i + 1 < legs.length &&
        legs[i + 1].type === EdgeType.TRANSIT &&
        prev.lineId !== legs[i + 1].lineId
      ) {
        transferStationIds.add(curr.from);
      }
    }
    for (const stationId of transferStationIds) {
      const station = stations.find((s) => s.id === stationId);
      if (!station) continue;
      const coord = coordMap.get(stationId) || [station.lng, station.lat];
      features.push({
        type: 'Feature',
        properties: {
          featureType: 'journey-transfer',
          id: station.id,
          name: station.name,
          code: station.code,
        },
        geometry: { type: 'Point', coordinates: coord },
      });
    }

    return { type: 'FeatureCollection', features };
  }

  private async getShapeSegmentCoords(
    lineId: string,
    fromStationId: string,
    toStationId: string,
    fromCoord: [number, number],
    toCoord: [number, number],
    lineMap?: Map<
      string,
      { id: string; name: string | null; color: string; code: string | null }
    >,
  ): Promise<[number, number][] | null> {
    try {
      if (this.lineShapeCache.has(lineId)) {
        const cached = this.lineShapeCache.get(lineId)!;
        if (cached && cached.length >= 2) {
          return this.sliceCoordinateArray(cached, fromCoord, toCoord);
        }
        return null;
      }

      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          str,
        );

      let line = lineMap?.get(lineId) || null;
      if (!line && lineId) {
        line = isUuid(lineId)
          ? await this.db.line.findUnique({
              where: { id: lineId },
              select: { id: true, code: true, name: true, color: true },
            })
          : await this.db.line.findFirst({
              where: { code: lineId },
              select: { id: true, code: true, name: true, color: true },
            });
      }

      const actualLineId = line?.id || (isUuid(lineId) ? lineId : null);
      let lineCoords: [number, number][] = [];

      if (actualLineId) {
        const trip = await this.db.trip.findFirst({
          where: {
            lineId: actualLineId,
            shapeId: { not: null },
            isActive: true,
          },
          select: { shapeId: true },
        });

        let shapeId = trip?.shapeId ?? null;

        if (!shapeId && line?.code) {
          const aliasCode = line.code.replace('MUMBAI_', '');
          const altLine = await this.db.line.findFirst({
            where: {
              OR: [{ code: aliasCode }, { code: `MUMBAI_${aliasCode}` }],
              id: { not: actualLineId },
            },
            select: { id: true },
          });
          if (altLine) {
            const fallbackTrip = await this.db.trip.findFirst({
              where: {
                lineId: altLine.id,
                shapeId: { not: null },
                isActive: true,
              },
              select: { shapeId: true },
            });
            shapeId = fallbackTrip?.shapeId ?? null;
          }
        }

        if (shapeId) {
          const shapes = await this.db.shape.findMany({
            where: { shapeId, isActive: true },
            select: { latitude: true, longitude: true },
            orderBy: { sequence: 'asc' },
          });

          if (shapes.length >= 2) {
            lineCoords = shapes.map((s) => [s.longitude, s.latitude]);
          }
        }
      }

      // Check CTM Line 2B Fallback
      if (lineCoords.length === 0) {
        const lineStr =
          `${lineId || ''} ${line?.code || ''} ${line?.name || ''}`.toUpperCase();
        if (
          lineStr.includes('LINE2B') ||
          lineStr.includes('LINE 2B') ||
          lineStr.includes('MANDALE')
        ) {
          const ctm2b = this.loadCtmLine2b();
          const ctmCoords: [number, number][] =
            ctm2b?.alignmentGeometry?.coordinates || [];
          if (ctmCoords && ctmCoords.length >= 2) {
            lineCoords = ctmCoords;
          }
        }
      }

      this.lineShapeCache.set(lineId, lineCoords);
      if (actualLineId && actualLineId !== lineId) {
        this.lineShapeCache.set(actualLineId, lineCoords);
      }

      if (lineCoords.length >= 2) {
        return this.sliceCoordinateArray(lineCoords, fromCoord, toCoord);
      }

      return null;
    } catch (err) {
      this.logger.warn(
        `Failed to resolve shape segment for line ${lineId}: ${err}`,
      );
      return null;
    }
  }

  private sliceCoordinateArray(
    allCoords: [number, number][],
    fromCoord: [number, number],
    toCoord: [number, number],
  ): [number, number][] {
    let minDistanceToFrom = Infinity;
    let minDistanceToTo = Infinity;
    let idxFrom = -1;
    let idxTo = -1;

    for (let i = 0; i < allCoords.length; i++) {
      const p = allCoords[i];
      const dFrom =
        Math.pow(p[0] - fromCoord[0], 2) + Math.pow(p[1] - fromCoord[1], 2);
      const dTo =
        Math.pow(p[0] - toCoord[0], 2) + Math.pow(p[1] - toCoord[1], 2);
      if (dFrom < minDistanceToFrom) {
        minDistanceToFrom = dFrom;
        idxFrom = i;
      }
      if (dTo < minDistanceToTo) {
        minDistanceToTo = dTo;
        idxTo = i;
      }
    }

    if (idxFrom === -1 || idxTo === -1) {
      return [fromCoord, toCoord];
    }

    const coords: [number, number][] = [fromCoord];
    if (idxFrom < idxTo) {
      for (let i = idxFrom; i <= idxTo; i++) {
        coords.push(allCoords[i]);
      }
    } else if (idxFrom > idxTo) {
      for (let i = idxFrom; i >= idxTo; i--) {
        coords.push(allCoords[i]);
      }
    }
    coords.push(toCoord);
    return coords;
  }

  private async finalizeLeg(
    leg: JourneyLeg,
    prevLeg?: JourneyLeg | null,
    nextLeg?: JourneyLeg | null,
    stationMap?: Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        latitude: number;
        longitude: number;
      }
    >,
    lineMap?: Map<
      string,
      { id: string; name: string | null; color: string; code: string | null }
    >,
  ): Promise<void> {
    if (leg.type === EdgeType.TRANSIT) {
      // 1. Authoritative deterministic DB resolution from StationSequence and Platform
      const dbResolved = await this.resolveDeterministicDirectionAndPlatform(
        leg.from,
        leg.to,
        leg.lineId,
        stationMap,
        lineMap,
      );

      if (dbResolved.towards) {
        leg.towards = dbResolved.towards;
        leg.direction = dbResolved.towards.toUpperCase();
        leg.boardingPlatform = dbResolved.boardingPlatform;
        leg.alightingPlatform = dbResolved.alightingPlatform;
        leg.platform = dbResolved.boardingPlatform;
        leg.platformStatus = dbResolved.platformStatus;
      } else {
        // Fallback for lines without StationSequence: check if tripHeadsign exists in DB
        const tripHeadsign = await this.resolveTripHeadsign(
          leg.lineId,
          leg.from,
          leg.to,
        );
        leg.towards = tripHeadsign;
        leg.direction = tripHeadsign ? tripHeadsign.toUpperCase() : null;
        leg.boardingPlatform = null;
        leg.alightingPlatform = null;
        leg.platform = null;
        leg.platformStatus = 'UNKNOWN';
      }

      if (dbResolved.scheduledDurationSeconds) {
        leg.duration = dbResolved.scheduledDurationSeconds;
        leg.durationSeconds = dbResolved.scheduledDurationSeconds;
        leg.durationMinutes = Math.max(
          1,
          Math.round(dbResolved.scheduledDurationSeconds / 60),
        );
      }

      // 2. Door opening provenance
      const doorResult = this.resolveDoorSide();
      leg.doorsOpen = doorResult.doorsOpen;
      leg.doorSideStatus = doorResult.doorSideStatus;
      if (
        nextLeg?.type === EdgeType.TRANSIT &&
        nextLeg.lineId !== leg.lineId &&
        !nextLeg.throughServiceContinuationFromPrevious
      ) {
        const transfer = this.interchangeEvaluator.resolveTransferDetails(
          leg.toStationName,
          nextLeg.fromStationName,
          leg.lineName,
          nextLeg.lineName,
          leg.toStation?.code,
          nextLeg.fromStation?.code,
        );
        if (transfer) {
          leg.transferDetails = transfer;
          leg.transferTitle = transfer.name;
          leg.transferDurationText = transfer.durationDisplay;
          leg.transferInstructions = transfer.instructions;
          leg.transferSummary =
            transfer.pathwayDistanceMeters !== null
              ? `${transfer.pathwayDistanceMeters} m · ${transfer.durationDisplay}`
              : transfer.durationDisplay;
        }
      }
    } else if (leg.type === EdgeType.WALK || leg.type === EdgeType.TRANSFER) {
      const transfer = this.interchangeEvaluator.resolveTransferDetails(
        leg.fromStationName,
        leg.toStationName,
        prevLeg?.lineName,
        nextLeg?.lineName,
        leg.fromStation?.code,
        leg.toStation?.code,
      );

      if (transfer) {
        leg.transferDetails = transfer;
        leg.transferTitle = transfer.name;
        leg.transferDurationText = transfer.durationDisplay;
        leg.transferInstructions = transfer.instructions;
        if (transfer.estimatedDurationSeconds !== null) {
          leg.duration = transfer.estimatedDurationSeconds;
          leg.durationSeconds = transfer.estimatedDurationSeconds;
          leg.durationMinutes = Math.max(
            1,
            Math.round(transfer.estimatedDurationSeconds / 60),
          );
        } else {
          const fallbackDuration = Math.max(leg.duration, 180);
          leg.duration = fallbackDuration;
          leg.durationSeconds = fallbackDuration;
          leg.durationMinutes = Math.max(1, Math.round(fallbackDuration / 60));
        }
        leg.transferSummary =
          transfer.pathwayDistanceMeters !== null
            ? `${transfer.pathwayDistanceMeters} m · ${transfer.durationDisplay}`
            : transfer.durationDisplay;
      } else {
        const durMins = Math.max(1, Math.round(leg.duration / 60));
        const nextLineLabel = nextLeg?.lineName
          ? nextLeg.lineName.split('_')[0]
          : 'connecting line';
        leg.transferDetails = null;
        leg.transferTitle = `Transfer to ${nextLineLabel}`;
        leg.transferDurationText = `~${durMins} min`;
        leg.transferSummary = `Transfer — ~${durMins} min`;
        leg.transferInstructions = [
          `Follow signs to ${leg.toStationName} concourse`,
          `Proceed to connecting platform`,
        ];
      }
    }
  }

  private async resolveDeterministicDirectionAndPlatform(
    fromStationId: string,
    toStationId: string,
    lineId: string | null,
    stationMap?: Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        latitude: number;
        longitude: number;
      }
    >,
    lineMap?: Map<
      string,
      { id: string; name: string | null; color: string; code: string | null }
    >,
  ): Promise<{
    towards: string | null;
    boardingPlatform: string | null;
    alightingPlatform: string | null;
    platformStatus: 'KNOWN' | 'USER_REPORTED' | 'UNKNOWN';
    scheduledDurationSeconds: number | null;
  }> {
    if (!fromStationId || !toStationId) {
      return {
        towards: null,
        boardingPlatform: null,
        alightingPlatform: null,
        platformStatus: 'UNKNOWN',
        scheduledDurationSeconds: null,
      };
    }

    const cacheKey = `${fromStationId}:${toStationId}:${lineId || ''}`;
    if (this.directionPlatformCache.has(cacheKey)) {
      return this.directionPlatformCache.get(cacheKey)!;
    }

    try {
      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          str,
        );

      let fromSt:
        | {
            id: string;
            code: string;
            name: string;
            latitude: number;
            longitude: number;
          }
        | null
        | undefined = stationMap?.get(fromStationId);
      if (!fromSt) {
        fromSt = isUuid(fromStationId)
          ? await this.db.station.findUnique({
              where: { id: fromStationId },
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            })
          : await this.db.station.findFirst({
              where: { code: fromStationId },
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            });
      }

      let toSt:
        | {
            id: string;
            code: string;
            name: string;
            latitude: number;
            longitude: number;
          }
        | null
        | undefined = stationMap?.get(toStationId);
      if (!toSt) {
        toSt = isUuid(toStationId)
          ? await this.db.station.findUnique({
              where: { id: toStationId },
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            })
          : await this.db.station.findFirst({
              where: { code: toStationId },
              select: {
                id: true,
                code: true,
                name: true,
                latitude: true,
                longitude: true,
              },
            });
      }

      let line:
        | {
            id: string;
            code: string | null;
            name: string | null;
            color?: string | null;
          }
        | null
        | undefined = lineId ? lineMap?.get(lineId) : null;
      if (!line && lineId) {
        line = isUuid(lineId)
          ? await this.db.line.findUnique({
              where: { id: lineId },
              select: { id: true, code: true, name: true, color: true },
            })
          : await this.db.line.findFirst({
              where: { code: lineId },
              select: { id: true, code: true, name: true, color: true },
            });
      }

      // Resolve trip headsign from GTFS trips table if available
      const tripHeadsign = await this.resolveTripHeadsign(
        lineId,
        fromStationId,
        toStationId,
      );

      if (!fromSt || !toSt) {
        return {
          towards: null,
          boardingPlatform: null,
          alightingPlatform: null,
          platformStatus: 'UNKNOWN',
          scheduledDurationSeconds: null,
        };
      }

      // Resolve the direction from a GTFS trip that actually visits both
      // stations in the requested order. Never infer a platform number.
      const matchingTrips = await this.db.trip.findMany({
        where: {
          isActive: true,
          stopTimes: { some: { stationId: fromSt.id, isActive: true } },
          AND: [
            { stopTimes: { some: { stationId: toSt.id, isActive: true } } },
          ],
        },
        select: {
          id: true,
          lineId: true,
          tripHeadsign: true,
          directionId: true,
          stopTimes: {
            where: { isActive: true },
            orderBy: { stopSequence: 'asc' },
            select: {
              stationId: true,
              stopSequence: true,
              arrivalTime: true,
              departureTime: true,
            },
          },
        },
        take: 100,
      });

      const forwardTrips = matchingTrips.filter((trip) => {
        const fromStop = trip.stopTimes.find(
          (stop) => stop.stationId === fromSt.id,
        );
        const toStop = trip.stopTimes.find(
          (stop) => stop.stationId === toSt.id,
        );
        return (
          fromStop && toStop && fromStop.stopSequence < toStop.stopSequence
        );
      });
      const selectedTrip =
        forwardTrips.find((trip) => trip.lineId === line?.id) ??
        forwardTrips[0];
      const selectedFromStop = selectedTrip?.stopTimes.find(
        (stop) => stop.stationId === fromSt.id,
      );
      const selectedToStop = selectedTrip?.stopTimes.find(
        (stop) => stop.stationId === toSt.id,
      );

      let scheduledDurationSeconds: number | null = null;
      if (selectedFromStop?.departureTime && selectedToStop?.arrivalTime) {
        const diff = this.parseTimeDiff(
          selectedFromStop.departureTime,
          selectedToStop.arrivalTime,
        );
        if (diff > 0 && diff < 86400) {
          scheduledDurationSeconds = diff;
        }
      }

      const terminalStop = selectedTrip?.stopTimes.at(-1);
      const terminalStation = terminalStop
        ? await this.db.station.findUnique({
            where: { id: terminalStop.stationId },
            select: { id: true, name: true },
          })
        : null;
      const platform =
        selectedTrip && selectedFromStop && terminalStation
          ? await this.db.platform.findFirst({
              where: {
                isActive: true,
                lineId: selectedTrip.lineId,
                towardsStationId: terminalStation.id,
                level: { stationId: fromSt.id },
              },
              orderBy: { platformNumber: 'asc' },
              select: { platformNumber: true },
            })
          : null;

      let platformNumber: string | null = platform?.platformNumber ?? null;

      if (!platformNumber && (selectedTrip?.lineId || line?.id) && fromSt?.id) {
        const targetLineId = selectedTrip?.lineId || line?.id;
        if (targetLineId) {
          const platforms = await this.db.platform.findMany({
            where: {
              isActive: true,
              lineId: targetLineId,
              level: { stationId: fromSt.id },
            },
            orderBy: { platformNumber: 'asc' },
            select: { platformNumber: true },
          });
          if (platforms.length > 0) {
            const dirIdx = selectedTrip?.directionId === 1 ? 1 : 0;
            platformNumber = (platforms[dirIdx] || platforms[0]).platformNumber;
          }
        }
      }

      if (selectedTrip || platformNumber) {
        const result = {
          towards:
            terminalStation?.name ??
            tripHeadsign ??
            selectedTrip?.tripHeadsign ??
            null,
          boardingPlatform:
            platformNumber && platformNumber !== 'UNKNOWN'
              ? `Platform ${platformNumber}`
              : null,
          alightingPlatform: null,
          platformStatus:
            platformNumber && platformNumber !== 'UNKNOWN'
              ? ('KNOWN' as const)
              : ('UNKNOWN' as const),
          scheduledDurationSeconds,
        };
        this.directionPlatformCache.set(cacheKey, result);
        return result;
      }

      const fallbackResult = {
        towards: null,
        boardingPlatform: null,
        alightingPlatform: null,
        platformStatus: 'UNKNOWN' as const,
        scheduledDurationSeconds: null,
      };
      this.directionPlatformCache.set(cacheKey, fallbackResult);
      return fallbackResult;
    } catch (err) {
      this.logger.warn(
        `Error resolving deterministic platform/direction: ${err}`,
      );
      return {
        towards: null,
        boardingPlatform: null,
        alightingPlatform: null,
        platformStatus: 'UNKNOWN',
        scheduledDurationSeconds: null,
      };
    }
  }

  private resolveDoorSide(): {
    doorsOpen: DoorSide;
    doorSideStatus: DoorSideStatus;
  } {
    // GTFS has no door-side field; report unknown until an authoritative source
    // for this journey's platform provides it.
    return { doorsOpen: null, doorSideStatus: 'UNKNOWN_SOURCE_REQUIRED' };
  }

  private async resolveTripHeadsign(
    lineId: string | null,
    fromStationId: string,
    toStationId: string,
  ): Promise<string | null> {
    if (!lineId) return null;
    const cacheKey = `${lineId}:${fromStationId}:${toStationId}`;
    if (this.tripHeadsignCache.has(cacheKey)) {
      return this.tripHeadsignCache.get(cacheKey)!;
    }

    try {
      const trips = await this.db.trip.findMany({
        where: {
          lineId,
          isActive: true,
          tripHeadsign: { not: null },
          stopTimes: {
            some: {
              stationId: { in: [fromStationId, toStationId] },
              isActive: true,
            },
          },
        },
        select: {
          tripHeadsign: true,
          stopTimes: {
            where: {
              stationId: { in: [fromStationId, toStationId] },
              isActive: true,
            },
            select: { stationId: true, stopSequence: true },
          },
        },
        take: 10,
      });

      for (const t of trips) {
        const fromST = t.stopTimes.find((st) => st.stationId === fromStationId);
        const toST = t.stopTimes.find((st) => st.stationId === toStationId);
        if (
          fromST &&
          toST &&
          fromST.stopSequence < toST.stopSequence &&
          t.tripHeadsign
        ) {
          this.tripHeadsignCache.set(cacheKey, t.tripHeadsign);
          return t.tripHeadsign;
        }
      }
      this.tripHeadsignCache.set(cacheKey, null);
      return null;
    } catch {
      return null;
    }
  }

  /** Return the GTFS route color when valid; unknown colors remain unknown. */
  private resolveLineColor(l: {
    name: string | null;
    color: string | null;
  }): string {
    const color = (l.color ?? '').trim().replace(/^#/, '');
    return /^[0-9a-f]{6}$/i.test(color) ? `#${color.toUpperCase()}` : '';
  }
}
