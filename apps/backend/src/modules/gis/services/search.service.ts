import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { GeojsonService, GeoJsonRawResult } from './geojson.service';

interface StationLineProperty {
  code?: string;
  name?: string;
  color?: string;
}

interface StationFeatureProperties {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  city?: string;
  systemId?: string;
  lines?: StationLineProperty[];
  lineColor?: string;
  [key: string]: unknown;
}

interface StationFeature {
  type: string;
  id?: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: StationFeatureProperties;
  [key: string]: unknown;
}

function asPrimitiveString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function featureProperties(
  feature: Record<string, unknown>,
): Record<string, unknown> {
  const properties = feature.properties;
  return typeof properties === 'object' &&
    properties !== null &&
    !Array.isArray(properties)
    ? (properties as Record<string, unknown>)
    : {};
}

function resolveLineColor(color: string, lineName: string): string {
  const nameUpper = (lineName || '').toUpperCase();
  let resolved = color || '#3b82f6';
  if (
    resolved === '' ||
    ['#000000', '000000', '#ffffff', 'ffffff'].includes(resolved.toLowerCase())
  ) {
    if (nameUpper.includes('YELLOW') || nameUpper.includes('LINE 2A'))
      resolved = '#facc15';
    else if (nameUpper.includes('BLUE')) resolved = '#3b82f6';
    else if (nameUpper.includes('PINK')) resolved = '#ec4899';
    else if (nameUpper.includes('MAGENTA')) resolved = '#d946ef';
    else if (nameUpper.includes('RED')) resolved = '#ef4444';
    else if (nameUpper.includes('VIOLET')) resolved = '#8b5cf6';
    else if (nameUpper.includes('GREEN')) resolved = '#22c55e';
    else if (nameUpper.includes('AQUA')) resolved = '#06b6d4';
    else if (nameUpper.includes('ORANGE') || nameUpper.includes('AIRPORT'))
      resolved = '#f97316';
    else if (nameUpper.includes('RAPID')) resolved = '#14b8a6';
    else if (nameUpper.includes('GREY') || nameUpper.includes('GRAY'))
      resolved = '#9ca3af';
    else resolved = '#3b82f6';
  }
  return resolved;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly geojsonService: GeojsonService,
  ) {}

  async search(
    query: string,
    filterTypes?: string[],
  ): Promise<Record<string, unknown>> {
    const formattedQuery = `%${query}%`;
    const features: Record<string, unknown>[] = [];

    // 1. Search stations
    if (!filterTypes || filterTypes.includes('station')) {
      const stationsRaw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(
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
              'type', 'station',
              'city', st.city,
              'systemId', st."systemId",
              'lines', COALESCE((
                SELECT json_agg(json_build_object('code', l.code, 'name', l.name, 'color', COALESCE(l.color, '#00e5ff')))
                FROM (
                  SELECT DISTINCT l_sub.id, l_sub.code, l_sub.name, l_sub.color
                  FROM lines l_sub
                  JOIN trips t_sub ON t_sub."lineId" = l_sub.id
                  JOIN stop_times st_sub ON st_sub."tripId" = t_sub.id
                  WHERE st_sub."stationId" = st.id AND l_sub."isActive" = true
                  UNION
                  SELECT DISTINCT l_sub2.id, l_sub2.code, l_sub2.name, l_sub2.color
                  FROM lines l_sub2
                  JOIN station_sequences ss_sub ON ss_sub."lineId" = l_sub2.id
                  WHERE ss_sub."stationId" = st.id AND l_sub2."isActive" = true
                ) l
              ), '[]'::json)
            )
          ) as feature
        FROM stations st
        WHERE st."isActive" = true AND (st.name ILIKE $1 OR st.code ILIKE $1 OR st.city ILIKE $1)
        LIMIT 100;
      `,
        formattedQuery,
      );
      const resolvedStationFeatures: Record<string, unknown>[] =
        stationsRaw.map((r) => {
          const feat = r.feature as unknown as StationFeature;
          if (feat && feat.properties) {
            const lines = Array.isArray(feat.properties.lines)
              ? feat.properties.lines
              : [];
            const resolvedLines: StationLineProperty[] = lines.map((l) => ({
              ...l,
              color: resolveLineColor(l.color ?? '', l.name ?? ''),
            }));
            feat.properties.lines = resolvedLines;
            feat.properties.lineColor = resolvedLines[0]?.color || '#00e5ff';
          }
          return feat;
        });
      features.push(...resolvedStationFeatures);
    }

    // 2. Search lines
    if (!filterTypes || filterTypes.includes('line')) {
      const linesRaw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(
        `
        SELECT 
          l.id, l.code, l.name, l.color, s."shapeId",
          json_build_object(
            'type', 'Feature',
            'geometry', json_build_object(
              'type', 'LineString',
              'coordinates', json_agg(json_build_array(s.longitude, s.latitude) ORDER BY s.sequence)
            ),
            'properties', json_build_object(
              'id', l.id,
              'code', l.code,
              'name', l.name,
              'color', l.color,
              'type', 'line'
            )
          ) as feature
        FROM lines l
        JOIN trips t ON t."lineId" = l.id
        JOIN shapes s ON s."shapeId" = t."shapeId"
        WHERE l."isActive" = true AND (l.name ILIKE $1 OR l.code ILIKE $1)
        GROUP BY l.id, l.code, l.name, l.color, s."shapeId"
        LIMIT 10;
      `,
        formattedQuery,
      );
      features.push(...linesRaw.map((r) => r.feature));
    }

    // 3. Search systems
    if (!filterTypes || filterTypes.includes('system')) {
      const systemsRaw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(
        `
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
              'type', 'system'
            )
          ) as feature
        FROM systems sys
        LEFT JOIN stations st ON st."systemId" = sys.id AND st."isActive" = true
        WHERE sys."isActive" = true AND (sys.name ILIKE $1 OR sys.city ILIKE $1)
        GROUP BY sys.id, sys.code, sys.name, sys.city
        LIMIT 5;
      `,
        formattedQuery,
      );
      features.push(...systemsRaw.map((r) => r.feature));
    }

    // These partially open segments remain evidence-backed CTM overlays until
    // their station records are materialized. Keep them searchable without
    // fabricating database rows or platform/level counts.
    const phase1Features = [
      ...this.geojsonService.getLine2bPhase1SearchFeatures(query),
      ...this.geojsonService.getLine9Phase1SearchFeatures(query),
    ].filter((feature) => {
      if (!filterTypes) return true;
      const properties = featureProperties(feature);
      return filterTypes.includes(asPrimitiveString(properties.type));
    });
    const knownKeys = new Set<string>();
    for (const feature of features) {
      const properties = featureProperties(feature);
      const id = asPrimitiveString(properties.id ?? feature.id);
      const code = asPrimitiveString(properties.code);
      const name = asPrimitiveString(properties.name).trim().toLowerCase();
      if (id) knownKeys.add(id);
      if (code) knownKeys.add(code);
      if (name) knownKeys.add(name);
    }

    for (const feature of phase1Features) {
      const properties = featureProperties(feature);
      const id = asPrimitiveString(properties.id ?? feature.id);
      const code = asPrimitiveString(properties.code);
      const name = asPrimitiveString(properties.name).trim().toLowerCase();
      if (
        (id && knownKeys.has(id)) ||
        (code && knownKeys.has(code)) ||
        (name && knownKeys.has(name))
      ) {
        continue;
      }
      if (id) knownKeys.add(id);
      if (code) knownKeys.add(code);
      if (name) knownKeys.add(name);
      features.push(feature);
    }

    return this.geojsonService.wrapFeatureCollection(features);
  }

  async getNearbyEntities(
    lat: number,
    lon: number,
    radius: number,
    types: string[],
  ): Promise<Record<string, unknown>> {
    const features: Record<string, unknown>[] = [];
    const searchTypes = types.length === 0 ? ['station', 'entrance'] : types;

    // 1. Query nearby stations using ST_DWithin and ST_Distance geography
    if (searchTypes.includes('station')) {
      const stationsRaw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(
        `
        SELECT 
          st.id, st.code, st.name, st.latitude, st.longitude,
          ST_Distance(st.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance,
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
              'type', 'station',
              'distance', ST_Distance(st.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography),
              'lines', COALESCE((
                SELECT json_agg(json_build_object('code', l.code, 'name', l.name, 'color', l.color))
                FROM lines l
                JOIN station_sequences ss ON ss."lineId" = l.id
                WHERE ss."stationId" = st.id AND l."isActive" = true
              ), '[]'::json)
            )
          ) as feature
        FROM stations st
        WHERE st."isActive" = true AND ST_DWithin(st.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
        ORDER BY distance ASC
        LIMIT 20;
      `,
        lat,
        lon,
        radius,
      );
      features.push(...stationsRaw.map((r) => r.feature));
    }

    // 2. Query nearby entrances using ST_DWithin
    if (searchTypes.includes('entrance')) {
      const entrancesRaw = await this.prisma.$queryRawUnsafe<
        GeoJsonRawResult[]
      >(
        `
        SELECT 
          ent.id, ent.name, ent.latitude, ent.longitude, ent."stationId",
          ST_Distance(ent.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance,
          json_build_object(
            'type', 'Feature',
            'id', ent.id,
            'geometry', json_build_object(
              'type', 'Point',
              'coordinates', json_build_array(ent.longitude, ent.latitude)
            ),
            'properties', json_build_object(
              'id', ent.id,
              'name', ent.name,
              'type', 'entrance',
              'stationId', ent."stationId",
              'distance', ST_Distance(ent.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography),
              'accessible', ent.accessible
            )
          ) as feature
        FROM entrances ent
        WHERE ent."isActive" = true AND ST_DWithin(ent.geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
        ORDER BY distance ASC
        LIMIT 20;
      `,
        lat,
        lon,
        radius,
      );
      features.push(...entrancesRaw.map((r) => r.feature));
    }

    return this.geojsonService.wrapFeatureCollection(features);
  }
}
