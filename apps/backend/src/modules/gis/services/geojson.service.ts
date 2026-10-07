import { resolveLineColor } from '../../../common/utils/line-color.util';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../../../database/database.service';

export interface LayerConfig {
  id: string;
  name: string;
  endpoint: string;
  defaultVisible: boolean;
  style: Record<string, unknown>;
}

export interface GeoJsonRawResult {
  feature: Record<string, unknown>;
}

export interface LineProperties {
  id: string;
  code: string;
  name: string;
  color: string;
  systemId: string;
}

export interface LineFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: LineProperties;
}

export interface StationLine {
  code: string;
  name: string;
  color: string;
}

export interface StationProperties {
  id: string;
  code: string;
  name: string;
  type?: string;
  systemId: string;
  city?: string;
  wheelchairAccessible?: boolean;
  lines: StationLine[];
  lineInfrastructure?: Array<{
    lineId: string;
    lineCode: string;
    lineName: string;
    color: string;
    levelsCount: number;
    levelsEvidenceStatus: string;
    platformsCount: number;
    platformsEvidenceStatus: string;
  }>;
  color?: string;
  lineColor?: string;
  isInterchange?: boolean;
  interchangeComplexIds?: string[];
  levelsCount?: number;
  platformsCount?: number;
  exitsCount?: number;
}

interface InterchangeRegistryData {
  complexes: Array<{
    complexId: string;
    participatingStations?: string[];
    participatingLines?: StationLine[];
  }>;
}

interface Phase1CtmStation {
  canonicalId: string;
  name: string;
  longitude: number;
  latitude: number;
  aliases?: string[];
  sharedPhysicalStation?: boolean;
}

interface Phase1CtmData {
  stations: Phase1CtmStation[];
  alignmentGeometry?: { coordinates: [number, number][] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePhase1Ctm(value: unknown): Phase1CtmData | null {
  if (!isRecord(value) || !Array.isArray(value.stations)) return null;
  const stations: Phase1CtmStation[] = [];
  for (const item of value.stations) {
    if (
      !isRecord(item) ||
      typeof item.canonicalId !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.longitude !== 'number' ||
      typeof item.latitude !== 'number' ||
      (item.aliases !== undefined &&
        (!Array.isArray(item.aliases) ||
          !item.aliases.every((alias) => typeof alias === 'string')))
    )
      return null;
    stations.push({
      canonicalId: item.canonicalId,
      name: item.name,
      longitude: item.longitude,
      latitude: item.latitude,
      ...(Array.isArray(item.aliases) ? { aliases: item.aliases } : {}),
      ...(typeof item.sharedPhysicalStation === 'boolean'
        ? { sharedPhysicalStation: item.sharedPhysicalStation }
        : {}),
    });
  }

  let alignmentGeometry: Phase1CtmData['alignmentGeometry'];
  if (
    isRecord(value.alignmentGeometry) &&
    Array.isArray(value.alignmentGeometry.coordinates)
  ) {
    const coordinates: [number, number][] = [];
    for (const point of value.alignmentGeometry.coordinates) {
      if (
        !Array.isArray(point) ||
        typeof point[0] !== 'number' ||
        typeof point[1] !== 'number'
      )
        return null;
      coordinates.push([point[0], point[1]]);
    }
    alignmentGeometry = { coordinates };
  }
  return { stations, ...(alignmentGeometry ? { alignmentGeometry } : {}) };
}

export interface StationFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: StationProperties;
}

@Injectable()
export class GeojsonService {
  private interchangeRegistry: InterchangeRegistryData | null = null;

  constructor(private readonly prisma: DatabaseService) {}

  private loadLine2bPhase1Ctm(): Phase1CtmData | null {
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
    ];
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      try {
        return parsePhase1Ctm(
          JSON.parse(fs.readFileSync(candidate, 'utf8')) as unknown,
        );
      } catch {
        return null;
      }
    }
    return null;
  }

  private loadLine9Phase1Ctm(): Phase1CtmData | null {
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
    ];
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      try {
        return parsePhase1Ctm(
          JSON.parse(fs.readFileSync(candidate, 'utf8')) as unknown,
        );
      } catch {
        return null;
      }
    }
    return null;
  }

  private line2bStationFeature(station: Phase1CtmStation): StationFeature {
    const id = String(station.canonicalId);
    const line: StationLine = {
      code: 'MUMBAI_LINE2B',
      name: 'Mumbai Metro Line 2B (Yellow Line)',
      color: '#F0C800',
    };
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'Point',
        coordinates: [station.longitude, station.latitude],
      },
      properties: {
        id,
        code: id,
        name: station.name,
        city: 'Mumbai',
        systemId: 'MM',
        lines: [line],
        color: line.color,
        lineColor: line.color,
        isInterchange: false,
        levelsCount: 2,
        platformsCount: 2,
      },
    };
  }

  private line9StationFeature(station: Phase1CtmStation): StationFeature {
    const id = String(station.canonicalId);
    const line: StationLine = {
      code: 'MUMBAI_LINE9',
      name: 'Mumbai Metro Line 9 (Red Line Extension)',
      color: '#E31E24',
    };
    return {
      type: 'Feature',
      id,
      geometry: {
        type: 'Point',
        coordinates: [station.longitude, station.latitude],
      },
      properties: {
        id,
        code: id,
        name: station.name,
        city: 'Mumbai',
        systemId: 'MM',
        lines: [line],
        color: line.color,
        lineColor: line.color,
        isInterchange: false,
        type: 'station',
        levelsCount: 2,
        platformsCount: 2,
      },
    };
  }

  getLine2bPhase1SearchFeatures(query: string): Record<string, unknown>[] {
    const ctm = this.loadLine2bPhase1Ctm();
    if (!ctm) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    const results: Record<string, unknown>[] = [];
    for (const station of ctm.stations ?? []) {
      const searchableNames = [station.name, ...(station.aliases ?? [])].filter(
        (name: unknown): name is string => typeof name === 'string',
      );
      if (
        !searchableNames.some((name: string) =>
          name.toLocaleLowerCase().includes(normalizedQuery),
        )
      )
        continue;
      const feature = this.line2bStationFeature(station);
      feature.properties.type = 'station';
      results.push(feature as unknown as Record<string, unknown>);
    }
    const lineName = 'Mumbai Metro Line 2B (Yellow Line)';
    const lineAliases = [
      'mumbai metro line 2b',
      'mumbai_line2b',
      'line2b',
      'line 2b',
      'yellow line',
      'yellow',
    ];
    if (
      lineAliases.some(
        (alias) =>
          alias.includes(normalizedQuery) || normalizedQuery.includes(alias),
      )
    ) {
      results.push({
        type: 'Feature',
        id: 'MUMBAI_LINE2B_PHASE1',
        geometry: {
          type: 'LineString',
          coordinates: ctm.alignmentGeometry?.coordinates ?? [],
        },
        properties: {
          id: 'MUMBAI_LINE2B_PHASE1',
          code: 'MUMBAI_LINE2B',
          name: lineName,
          color: '#F0C800',
          type: 'line',
          status: 'PARTIALLY_OPERATIONAL',
          scheduleStatus: 'BLOCKED_SOURCE_REQUIRED',
        },
      });
    }
    return results;
  }

  getLine9Phase1SearchFeatures(query: string): Record<string, unknown>[] {
    const ctm = this.loadLine9Phase1Ctm();
    if (!ctm) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    const results: Record<string, unknown>[] = [];
    for (const station of ctm.stations ?? []) {
      if (station.sharedPhysicalStation) continue;
      const searchableNames = [station.name, ...(station.aliases ?? [])].filter(
        (name: unknown): name is string => typeof name === 'string',
      );
      if (
        !searchableNames.some((name: string) =>
          name.toLocaleLowerCase().includes(normalizedQuery),
        )
      )
        continue;
      results.push(
        this.line9StationFeature(station) as unknown as Record<string, unknown>,
      );
    }
    const lineAliases = [
      'mumbai metro line 9',
      'mumbai_line9',
      'line9',
      'line 9',
      'red line',
    ];
    if (
      lineAliases.some(
        (alias) =>
          alias.includes(normalizedQuery) || normalizedQuery.includes(alias),
      )
    ) {
      results.push({
        type: 'Feature',
        id: 'MUMBAI_LINE9_PHASE1',
        geometry: {
          type: 'LineString',
          coordinates: ctm.alignmentGeometry?.coordinates ?? [],
        },
        properties: {
          id: 'MUMBAI_LINE9_PHASE1',
          code: 'MUMBAI_LINE9',
          name: 'Mumbai Metro Line 9 (Red Line Extension)',
          color: '#E31E24',
          type: 'line',
          status: 'PARTIALLY_OPERATIONAL',
          scheduleStatus: 'BLOCKED_SOURCE_REQUIRED',
        },
      });
    }
    return results;
  }

  private loadInterchangeRegistry(): InterchangeRegistryData {
    if (this.interchangeRegistry) return this.interchangeRegistry;
    const candidates = [
      path.resolve(
        process.cwd(),
        'datasets/mumbai/network/interchange-complexes.json',
      ),
      path.resolve(
        process.cwd(),
        '../../datasets/mumbai/network/interchange-complexes.json',
      ),
      path.resolve(
        __dirname,
        '../../../../../../datasets/mumbai/network/interchange-complexes.json',
      ),
    ];
    for (const candidate of candidates) {
      if (!fs.existsSync(candidate)) continue;
      try {
        this.interchangeRegistry = JSON.parse(
          fs.readFileSync(candidate, 'utf8'),
        ) as InterchangeRegistryData;
        return this.interchangeRegistry;
      } catch {
        break;
      }
    }
    this.interchangeRegistry = { complexes: [] };
    return this.interchangeRegistry;
  }

  private applyInterchangeMembership(features: StationFeature[]): void {
    const featuresByCode = new Map(
      features.map((feature) => [feature.properties.code, feature]),
    );
    for (const complex of this.loadInterchangeRegistry().complexes) {
      const participants = (complex.participatingStations ?? [])
        .map((stationCode) => featuresByCode.get(stationCode))
        .filter((feature): feature is StationFeature => Boolean(feature));
      if (participants.length === 0) continue;
      const combinedLines = new Map<string, StationLine>();
      for (const participant of participants) {
        for (const line of participant.properties.lines ?? []) {
          combinedLines.set(line.code || line.name, line);
        }
      }
      for (const line of complex.participatingLines ?? []) {
        combinedLines.set(line.code || line.name, line);
      }
      const lines = [...combinedLines.values()];

      for (const participant of participants) {
        participant.properties.lines = lines;
        participant.properties.isInterchange =
          (complex.participatingStations?.length ?? 0) > 1;
        participant.properties.interchangeComplexIds = [
          ...new Set([
            ...(participant.properties.interchangeComplexIds ?? []),
            complex.complexId,
          ]),
        ];
        participant.properties.color =
          lines[0]?.color || participant.properties.color;
        participant.properties.lineColor = participant.properties.color;
      }
    }
  }

  getLayerRegistry(): { version: string; layers: LayerConfig[] } {
    return {
      version: '1.0.0',
      layers: [
        {
          id: 'lines',
          name: 'Metro Lines',
          endpoint: '/map/lines',
          defaultVisible: true,
          style: {
            type: 'line',
            color: 'operator', // dynamic from features
            width: 4,
          },
        },
        {
          id: 'stations',
          name: 'Passenger Stations',
          endpoint: '/map/stations',
          defaultVisible: true,
          style: {
            type: 'circle',
            color: '#06b6d4', // MetroRadar Cyan
            radius: 6,
            strokeColor: '#09090b',
            strokeWidth: 2,
          },
        },
      ],
    };
  }

  async getSystemsGeoJson(): Promise<Record<string, unknown>> {
    const raw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(`
      SELECT 
        sys.id, sys.code, sys.name, sys.city,
        json_build_object(
          'type', 'Feature',
          'id', sys.id,
          'geometry', json_build_object(
            'type', 'Point',
            'coordinates', json_build_array(
              COALESCE(AVG(st.longitude), 0.0),
              COALESCE(AVG(st.latitude), 0.0)
            )
          ),
          'properties', json_build_object(
            'id', sys.id,
            'code', sys.code,
            'name', sys.name,
            'city', sys.city,
            'status', sys.status
          )
        ) as feature
      FROM systems sys
      LEFT JOIN stations st ON st."systemId" = sys.id AND st."isActive" = true
      WHERE sys."isActive" = true
      GROUP BY sys.id, sys.code, sys.name, sys.city;
    `);

    const features = raw.map((r) => r.feature);
    return this.wrapFeatureCollection(features);
  }

  async getLinesGeoJson(): Promise<Record<string, unknown>> {
    // Return line geometries by querying unique line-shape combinations from trips,
    // then aggregating coordinates from shapes. This prevents massive coordinate
    // duplication caused by trip-level joins, and remaps black/white/null to visible blue.
    const raw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(`
      SELECT 
        l.id, l.code, l.name, l.color, s."shapeId",
        json_build_object(
          'type', 'Feature',
          'geometry', json_build_object(
            'type', 'LineString',
            'coordinates', (
               SELECT json_agg(json_build_array(sh.longitude, sh.latitude) ORDER BY sh.sequence)
               FROM shapes sh
               WHERE sh."shapeId" = s."shapeId" AND sh."systemId" = l."systemId"
            )
          ),
          'properties', json_build_object(
            'id', l.id,
            'code', l.code,
            'name', l.name,
            'color', COALESCE(l.color, ''),
            'systemId', l."systemId"
          )
        ) as feature
      FROM lines l
      JOIN (
        SELECT DISTINCT "lineId", "shapeId"
        FROM trips
        WHERE "shapeId" IS NOT NULL
      ) s ON s."lineId" = l.id
      WHERE l."isActive" = true;
    `);

    // Parse features and dynamically resolve color coding from transit route names
    const features = raw.map((r) => {
      const feat = r.feature as unknown as LineFeature;
      feat.properties.color = resolveLineColor(
        feat.properties.color,
        feat.properties.name,
      );
      return feat as unknown as Record<string, unknown>;
    });

    // Before full database materialization, render the independently sourced
    // operational Line 2B segment. A database shape supersedes this overlay.
    const line2b = this.loadLine2bPhase1Ctm();
    const line2bAlreadyMaterialized = features.some(
      (feature) =>
        (feature as unknown as LineFeature).properties?.code ===
        'MUMBAI_LINE2B',
    );
    const line2bCoordinates = line2b?.alignmentGeometry?.coordinates;
    if (
      !line2bAlreadyMaterialized &&
      line2bCoordinates &&
      line2bCoordinates.length >= 2
    ) {
      features.push({
        type: 'Feature',
        id: 'MUMBAI_LINE2B_PHASE1',
        geometry: {
          type: 'LineString',
          coordinates: line2bCoordinates,
        },
        properties: {
          id: 'MUMBAI_LINE2B_PHASE1',
          code: 'MUMBAI_LINE2B',
          name: 'Mumbai Metro Line 2B (Yellow Line) — operational segment',
          color: '#F0C800',
          systemId: 'MM',
          status: 'PARTIALLY_OPERATIONAL',
          scheduleStatus: 'BLOCKED_SOURCE_REQUIRED',
        },
      });
    }

    // Line 9's open Dahisar East–Kashigaon segment is rendered from its
    // evidence-backed CTM slice; Dahisar East remains the shared Line 7 stop.
    const line9 = this.loadLine9Phase1Ctm();
    const line9AlreadyMaterialized = features.some(
      (feature) =>
        (feature as unknown as LineFeature).properties?.code === 'MUMBAI_LINE9',
    );
    const line9Coordinates = line9?.alignmentGeometry?.coordinates;
    if (
      !line9AlreadyMaterialized &&
      line9Coordinates &&
      line9Coordinates.length >= 2
    ) {
      features.push({
        type: 'Feature',
        id: 'MUMBAI_LINE9_PHASE1',
        geometry: { type: 'LineString', coordinates: line9Coordinates },
        properties: {
          id: 'MUMBAI_LINE9_PHASE1',
          code: 'MUMBAI_LINE9',
          name: 'Mumbai Metro Line 9 (Red Line Extension) — operational phase I',
          color: '#E31E24',
          systemId: 'MM',
          status: 'PARTIALLY_OPERATIONAL',
          scheduleStatus: 'BLOCKED_SOURCE_REQUIRED',
          throughServiceFromLineId: 'MUMBAI_LINE7',
        },
      });
    }

    return this.wrapFeatureCollection(features);
  }

  async getStationsGeoJson(): Promise<Record<string, unknown>> {
    const raw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(`
      SELECT 
        st.id, st.code, st.name, st.latitude, st.longitude,
        json_build_object(
          'type', 'Feature',
          'id', st.id,
          'geometry', json_build_object(
            'type', 'Point',
            'coordinates', json_build_array(st.longitude, st.latitude)
          ),
          'properties', json_build_object(
            'id', st.id,
            'code', st.code,
            'name', st.name,
            'city', st.city,
            'systemId', st."systemId",
            'wheelchairAccessible', st."wheelchairAccessible",
            'levelsCount', COALESCE((
              SELECT COUNT(*)::int
              FROM levels lvl
              WHERE lvl."stationId" = st.id AND lvl."isActive" = true
            ), 0),
            'platformsCount', COALESCE((
              SELECT COUNT(*)::int
              FROM platforms pf
              JOIN levels lvl ON lvl.id = pf."levelId"
              WHERE lvl."stationId" = st.id AND pf."isActive" = true
            ), 0),
            'lineInfrastructure', COALESCE((
              SELECT json_agg(json_build_object(
                'lineId', serving.id,
                'lineCode', serving.code,
                'lineName', serving.name,
                'color', COALESCE(serving.color, ''),
                'levelsCount', (SELECT COUNT(*)::int FROM levels lvl WHERE lvl."stationId" = st.id AND lvl."lineId" = serving.id AND lvl."isActive" = true),
                'levelsEvidenceStatus', (SELECT COALESCE(string_agg(DISTINCT lvl."evidenceStatus", ','), 'UNKNOWN') FROM levels lvl WHERE lvl."stationId" = st.id AND lvl."lineId" = serving.id AND lvl."isActive" = true),
                'platformsCount', (SELECT COUNT(*)::int FROM platforms pf JOIN levels lvl ON lvl.id = pf."levelId" WHERE lvl."stationId" = st.id AND pf."lineId" = serving.id AND pf."isActive" = true),
                'platformsEvidenceStatus', (SELECT COALESCE(string_agg(DISTINCT pf."evidenceStatus", ','), 'UNKNOWN') FROM platforms pf JOIN levels lvl ON lvl.id = pf."levelId" WHERE lvl."stationId" = st.id AND pf."lineId" = serving.id AND pf."isActive" = true)
              ))
              FROM (
                SELECT DISTINCT l.id, l.code, l.name, l.color
                FROM lines l
                WHERE l."isActive" = true AND (
                  EXISTS (SELECT 1 FROM station_sequences ss WHERE ss."stationId" = st.id AND ss."lineId" = l.id AND ss."isActive" = true)
                  OR EXISTS (SELECT 1 FROM platforms pf JOIN levels lvl ON lvl.id = pf."levelId" WHERE lvl."stationId" = st.id AND pf."lineId" = l.id AND pf."isActive" = true)
                  OR EXISTS (SELECT 1 FROM trips t JOIN stop_times stt ON stt."tripId" = t.id WHERE stt."stationId" = st.id AND t."lineId" = l.id)
                )
              ) serving
            ), '[]'::json),
            'exitsCount', COALESCE((
              SELECT COUNT(*)::int
              FROM entrances ent
              WHERE ent."stationId" = st.id AND ent."isActive" = true
            ), 0),
            'lines', COALESCE((
              SELECT json_agg(json_build_object(
                'code', l.code,
                'name', l.name,
                'color', COALESCE(l.color, '')
              ))
              FROM (
                SELECT DISTINCT l_sub.id, l_sub.code, l_sub.name, l_sub.color
                FROM lines l_sub
                JOIN trips t_sub ON t_sub."lineId" = l_sub.id
                JOIN stop_times st_sub ON st_sub."tripId" = t_sub.id
                WHERE st_sub."stationId" = st.id AND l_sub."isActive" = true
              ) l
            ), '[]'::json)
          )
        ) as feature
      FROM stations st
      WHERE st."isActive" = true;
    `);

    const features = raw.map((r) => {
      const feat = r.feature as unknown as StationFeature;
      if (feat.properties && Array.isArray(feat.properties.lines)) {
        feat.properties.lines = feat.properties.lines.map((l) => {
          const nameUpper = (l.name || '').toUpperCase();
          let color = (l.color || '').trim();
          if (
            !color ||
            [
              '#000000',
              '000000',
              '#ffffff',
              'ffffff',
              '#3b82f6',
              '3b82f6',
            ].includes(color.toLowerCase())
          ) {
            if (nameUpper.includes('YELLOW') || nameUpper.includes('LINE 2A')) {
              color = '#facc15';
            } else if (nameUpper.includes('BLUE')) {
              color = '#3b82f6';
            } else if (nameUpper.includes('PINK')) {
              color = '#ec4899';
            } else if (nameUpper.includes('MAGENTA')) {
              color = '#d946ef';
            } else if (nameUpper.includes('RED')) {
              color = '#ef4444';
            } else if (nameUpper.includes('VIOLET')) {
              color = '#8b5cf6';
            } else if (nameUpper.includes('GREEN')) {
              color = '#22c55e';
            } else if (nameUpper.includes('AQUA')) {
              color = '#06b6d4';
            } else if (
              nameUpper.includes('ORANGE') ||
              nameUpper.includes('AIRPORT')
            ) {
              color = '#f97316';
            } else if (
              nameUpper.includes('GREY') ||
              nameUpper.includes('GRAY')
            ) {
              color = '#808080';
            } else if (
              nameUpper.includes('TEAL') ||
              nameUpper.includes('RAPID')
            ) {
              color = '#14b8a6';
            } else if (nameUpper.includes('KOCHI')) {
              color = '#0ea5e9';
            } else {
              color = '#3b82f6';
            }
          }
          return { ...l, color };
        });
        const primaryColor = feat.properties.lines[0]?.color || '#00e5ff';
        feat.properties.color = primaryColor;
        feat.properties.lineColor = primaryColor;
      } else {
        feat.properties.color = '#00e5ff';
        feat.properties.lineColor = '#00e5ff';
      }

      const stNameUpper = (feat.properties?.name || '').toUpperCase();
      if (stNameUpper.includes('TERMINAL 1') || stNameUpper.includes('T1')) {
        feat.properties.color = '#d946ef';
        feat.properties.lines = [
          { name: 'Magenta Line', color: '#d946ef', code: 'MAG' },
        ];
      } else if (
        stNameUpper === 'IGI AIRPORT' ||
        (stNameUpper.includes('IGI AIRPORT') &&
          !stNameUpper.includes('TERMINAL 1'))
      ) {
        feat.properties.color = '#f97316';
        feat.properties.lines = [
          { name: 'Orange Line', color: '#f97316', code: 'ORG' },
        ];
      }

      return feat as unknown as Record<string, unknown>;
    });

    const line2b = this.loadLine2bPhase1Ctm();
    if (line2b?.stations?.length) {
      const knownCodes = new Set(
        features.map(
          (feature) => (feature as unknown as StationFeature).properties.code,
        ),
      );
      for (const station of line2b.stations) {
        const feature = this.line2bStationFeature(station);
        if (!knownCodes.has(feature.properties.code)) {
          features.push(feature as unknown as Record<string, unknown>);
          knownCodes.add(feature.properties.code);
        }
      }
    }

    const line9 = this.loadLine9Phase1Ctm();
    if (line9?.stations?.length) {
      const knownIds = new Set(
        features.map(
          (feature) => (feature as unknown as StationFeature).properties.id,
        ),
      );
      for (const station of line9.stations) {
        if (station.sharedPhysicalStation) continue;
        const feature = this.line9StationFeature(station);
        if (!knownIds.has(feature.properties.id)) {
          features.push(feature as unknown as Record<string, unknown>);
          knownIds.add(feature.properties.id);
        }
      }
    }

    this.applyInterchangeMembership(features as unknown as StationFeature[]);
    return this.wrapFeatureCollection(features);
  }

  async getStationFeature(id: string): Promise<Record<string, unknown> | null> {
    if (id.startsWith('STN_L2B_')) {
      const line2b = this.loadLine2bPhase1Ctm();
      const station = line2b?.stations.find((item) => item.canonicalId === id);
      if (station)
        return this.line2bStationFeature(station) as unknown as Record<
          string,
          unknown
        >;
    }
    if (id.startsWith('STN_L9_')) {
      const line9 = this.loadLine9Phase1Ctm();
      const station = line9?.stations.find((item) => item.canonicalId === id);
      if (station && !station.sharedPhysicalStation) {
        return this.line9StationFeature(station) as unknown as Record<
          string,
          unknown
        >;
      }
    }

    const raw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(
      `
      SELECT 
        st.id, st.code, st.name, st.latitude, st.longitude,
        json_build_object(
          'type', 'Feature',
          'id', st.id,
          'geometry', json_build_object(
            'type', 'Point',
            'coordinates', json_build_array(st.longitude, st.latitude)
          ),
          'properties', json_build_object(
            'id', st.id,
            'code', st.code,
            'name', st.name,
            'city', st.city,
            'systemId', st."systemId",
            'wheelchairAccessible', st."wheelchairAccessible",
            'levelsCount', COALESCE((
              SELECT COUNT(*)::int
              FROM levels lvl
              WHERE lvl."stationId" = st.id AND lvl."isActive" = true
            ), 0),
            'platformsCount', COALESCE((
              SELECT COUNT(*)::int
              FROM platforms pf
              JOIN levels lvl ON lvl.id = pf."levelId"
              WHERE lvl."stationId" = st.id AND pf."isActive" = true
            ), 0),
            'lineInfrastructure', COALESCE((
              SELECT json_agg(json_build_object(
                'lineId', serving.id,
                'lineCode', serving.code,
                'lineName', serving.name,
                'color', COALESCE(serving.color, ''),
                'levelsCount', (SELECT COUNT(*)::int FROM levels lvl WHERE lvl."stationId" = st.id AND lvl."lineId" = serving.id AND lvl."isActive" = true),
                'levelsEvidenceStatus', (SELECT COALESCE(string_agg(DISTINCT lvl."evidenceStatus", ','), 'UNKNOWN') FROM levels lvl WHERE lvl."stationId" = st.id AND lvl."lineId" = serving.id AND lvl."isActive" = true),
                'platformsCount', (SELECT COUNT(*)::int FROM platforms pf JOIN levels lvl ON lvl.id = pf."levelId" WHERE lvl."stationId" = st.id AND pf."lineId" = serving.id AND pf."isActive" = true),
                'platformsEvidenceStatus', (SELECT COALESCE(string_agg(DISTINCT pf."evidenceStatus", ','), 'UNKNOWN') FROM platforms pf JOIN levels lvl ON lvl.id = pf."levelId" WHERE lvl."stationId" = st.id AND pf."lineId" = serving.id AND pf."isActive" = true)
              ))
              FROM (
                SELECT DISTINCT l.id, l.code, l.name, l.color
                FROM lines l
                WHERE l."isActive" = true AND (
                  EXISTS (SELECT 1 FROM station_sequences ss WHERE ss."stationId" = st.id AND ss."lineId" = l.id AND ss."isActive" = true)
                  OR EXISTS (SELECT 1 FROM platforms pf JOIN levels lvl ON lvl.id = pf."levelId" WHERE lvl."stationId" = st.id AND pf."lineId" = l.id AND pf."isActive" = true)
                  OR EXISTS (SELECT 1 FROM trips t JOIN stop_times stt ON stt."tripId" = t.id WHERE stt."stationId" = st.id AND t."lineId" = l.id)
                )
              ) serving
            ), '[]'::json),
            'exitsCount', COALESCE((
              SELECT COUNT(*)::int
              FROM entrances ent
              WHERE ent."stationId" = st.id AND ent."isActive" = true
            ), 0),
            'lines', COALESCE((
              SELECT json_agg(json_build_object(
                'code', l.code,
                'name', l.name,
                'color', COALESCE(l.color, '')
              ))
              FROM (
                SELECT DISTINCT l_sub.id, l_sub.code, l_sub.name, l_sub.color
                FROM lines l_sub
                JOIN trips t_sub ON t_sub."lineId" = l_sub.id
                JOIN stop_times st_sub ON st_sub."tripId" = t_sub.id
                WHERE st_sub."stationId" = st.id AND l_sub."isActive" = true
              ) l
            ), '[]'::json)
          )
        ) as feature
      FROM stations st
      WHERE st."isActive" = true AND st.id = $1::uuid;
    `,
      id,
    );

    if (raw.length === 0) return null;
    const feat = raw[0].feature as unknown as StationFeature;
    if (feat.properties && Array.isArray(feat.properties.lines)) {
      feat.properties.lines = feat.properties.lines.map((l) => {
        const nameUpper = (l.name || '').toUpperCase();
        let color = l.color || '#3b82f6';
        if (
          color === '' ||
          ['#000000', '000000', '#ffffff', 'ffffff'].includes(
            color.toLowerCase(),
          )
        ) {
          if (nameUpper.includes('YELLOW') || nameUpper.includes('LINE 2A')) {
            color = '#facc15';
          } else if (nameUpper.includes('BLUE')) {
            color = '#3b82f6';
          } else if (nameUpper.includes('PINK')) {
            color = '#ec4899';
          } else if (nameUpper.includes('MAGENTA')) {
            color = '#d946ef';
          } else if (nameUpper.includes('RED')) {
            color = '#ef4444';
          } else if (nameUpper.includes('VIOLET')) {
            color = '#8b5cf6';
          } else if (nameUpper.includes('GREEN')) {
            color = '#22c55e';
          } else if (nameUpper.includes('AQUA')) {
            color = '#06b6d4';
          } else if (
            nameUpper.includes('ORANGE') ||
            nameUpper.includes('AIRPORT')
          ) {
            color = '#f97316';
          } else if (nameUpper.includes('RAPID')) {
            color = '#14b8a6';
          } else if (nameUpper.includes('KOCHI')) {
            color = '#0ea5e9';
          } else {
            color = '#3b82f6';
          }
        }
        return { ...l, color };
      });
      const primaryColor = feat.properties.lines[0]?.color || '#00e5ff';
      feat.properties.color = primaryColor;
      feat.properties.lineColor = primaryColor;
    } else {
      feat.properties.color = '#00e5ff';
      feat.properties.lineColor = '#00e5ff';
    }

    this.applyInterchangeMembership([feat]);

    return feat as unknown as Record<string, unknown>;
  }

  wrapFeatureCollection(
    features: Record<string, unknown>[],
    systemId?: string,
  ): Record<string, unknown> {
    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      systemId: systemId || null,
      type: 'FeatureCollection',
      features: features || [],
    };
  }
}
