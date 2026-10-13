import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

function normalizeGtfsRouteColor(value: string | null | undefined): string {
  const color = (value ?? '').trim().replace(/^#/, '');
  return /^[0-9a-f]{6}$/i.test(color) ? `#${color.toUpperCase()}` : '';
}

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
  constructor(private readonly prisma: DatabaseService) {}

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
    // Return one canonical direction shape per line. Trips normally carry a
    // shape for each direction; rendering both as separate line features causes
    // a doubled corridor/highlight where the two track geometries are offset.
    const raw = await this.prisma.$queryRawUnsafe<GeoJsonRawResult[]>(`
      WITH canonical_shapes AS (
        SELECT DISTINCT ON (t."lineId") t."lineId", t."shapeId"
        FROM trips t
        WHERE t."shapeId" IS NOT NULL
        ORDER BY
          t."lineId",
          CASE WHEN t."directionId" = 0 THEN 0
               WHEN t."directionId" IS NULL THEN 1
               ELSE 2 END,
          t."shapeId"
      )
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
      JOIN canonical_shapes s ON s."lineId" = l.id
      WHERE l."isActive" = true;
    `);

    const features = raw.map((r) => {
      const feat = r.feature as unknown as LineFeature;
      feat.properties.color = normalizeGtfsRouteColor(feat.properties.color);
      return feat as unknown as Record<string, unknown>;
    });

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
                  EXISTS (SELECT 1 FROM trips t JOIN stop_times stt ON stt."tripId" = t.id WHERE stt."stationId" = st.id AND t."lineId" = l.id)
                  OR EXISTS (
                    SELECT 1 FROM interchanges i
                    JOIN platforms fp ON fp.id = i."fromPlatformId"
                    JOIN levels fl ON fl.id = fp."levelId"
                    JOIN platforms tp ON tp.id = i."toPlatformId"
                    WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
                      AND fl."stationId" = st.id AND tp."lineId" = l.id
                  )
                  OR EXISTS (
                    SELECT 1 FROM interchanges i
                    JOIN platforms fp ON fp.id = i."fromPlatformId"
                    JOIN platforms tp ON tp.id = i."toPlatformId"
                    JOIN levels tl ON tl.id = tp."levelId"
                    WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
                      AND tl."stationId" = st.id AND fp."lineId" = l.id
                  )
                  OR EXISTS (
                    SELECT 1 FROM stations same_stn
                    JOIN trips t_same ON true
                    JOIN stop_times st_same ON st_same."tripId" = t_same.id AND st_same."stationId" = same_stn.id
                    WHERE LOWER(TRIM(same_stn.name)) = LOWER(TRIM(st.name))
                      AND same_stn.city = st.city
                      AND same_stn."isActive" = true
                      AND t_same."lineId" = l.id
                      AND t_same."isActive" = true
                      AND st_same."isActive" = true
                  )
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
                WHERE l_sub."isActive" = true AND (
                  EXISTS (
                    SELECT 1 FROM trips t_sub JOIN stop_times st_sub ON st_sub."tripId" = t_sub.id
                    WHERE st_sub."stationId" = st.id AND t_sub."lineId" = l_sub.id AND t_sub."isActive" = true AND st_sub."isActive" = true
                  )
                  OR EXISTS (
                    SELECT 1 FROM interchanges i
                    JOIN platforms fp ON fp.id = i."fromPlatformId"
                    JOIN levels fl ON fl.id = fp."levelId"
                    JOIN platforms tp ON tp.id = i."toPlatformId"
                    WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
                      AND fl."stationId" = st.id AND tp."lineId" = l_sub.id
                  )
                  OR EXISTS (
                    SELECT 1 FROM interchanges i
                    JOIN platforms fp ON fp.id = i."fromPlatformId"
                    JOIN platforms tp ON tp.id = i."toPlatformId"
                    JOIN levels tl ON tl.id = tp."levelId"
                    WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
                      AND tl."stationId" = st.id AND fp."lineId" = l_sub.id
                  )
                  OR EXISTS (
                    SELECT 1 FROM stations same_stn
                    JOIN trips t_same ON true
                    JOIN stop_times st_same ON st_same."tripId" = t_same.id AND st_same."stationId" = same_stn.id
                    WHERE LOWER(TRIM(same_stn.name)) = LOWER(TRIM(st.name))
                      AND same_stn.city = st.city
                      AND same_stn."isActive" = true
                      AND t_same."lineId" = l_sub.id
                      AND t_same."isActive" = true
                      AND st_same."isActive" = true
                  )
                )
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
        feat.properties.lines = feat.properties.lines.map((line) => ({
          ...line,
          color: normalizeGtfsRouteColor(line.color),
        }));
        const primaryColor = feat.properties.lines[0]?.color;
        feat.properties.color = primaryColor;
        feat.properties.lineColor = primaryColor;
      } else {
        feat.properties.color = undefined;
        feat.properties.lineColor = undefined;
      }

      return feat as unknown as Record<string, unknown>;
    });

    return this.wrapFeatureCollection(features);
  }

  async getStationFeature(id: string): Promise<Record<string, unknown> | null> {
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
                  EXISTS (SELECT 1 FROM trips t JOIN stop_times stt ON stt."tripId" = t.id WHERE stt."stationId" = st.id AND t."lineId" = l.id)
                  OR EXISTS (
                    SELECT 1 FROM interchanges i
                    JOIN platforms fp ON fp.id = i."fromPlatformId"
                    JOIN levels fl ON fl.id = fp."levelId"
                    JOIN platforms tp ON tp.id = i."toPlatformId"
                    WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
                      AND fl."stationId" = st.id AND tp."lineId" = l.id
                  )
                  OR EXISTS (
                    SELECT 1 FROM interchanges i
                    JOIN platforms fp ON fp.id = i."fromPlatformId"
                    JOIN platforms tp ON tp.id = i."toPlatformId"
                    JOIN levels tl ON tl.id = tp."levelId"
                    WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
                      AND tl."stationId" = st.id AND fp."lineId" = l.id
                  )
                  OR EXISTS (
                    SELECT 1 FROM stations same_stn
                    JOIN trips t_same ON true
                    JOIN stop_times st_same ON st_same."tripId" = t_same.id AND st_same."stationId" = same_stn.id
                    WHERE LOWER(TRIM(same_stn.name)) = LOWER(TRIM(st.name))
                      AND same_stn.city = st.city
                      AND same_stn."isActive" = true
                      AND t_same."lineId" = l.id
                      AND t_same."isActive" = true
                      AND st_same."isActive" = true
                  )
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
                WHERE l_sub."isActive" = true AND (
                  EXISTS (
                    SELECT 1 FROM trips t_sub JOIN stop_times st_sub ON st_sub."tripId" = t_sub.id
                    WHERE st_sub."stationId" = st.id AND t_sub."lineId" = l_sub.id AND t_sub."isActive" = true AND st_sub."isActive" = true
                  )
                  OR EXISTS (
                    SELECT 1 FROM interchanges i
                    JOIN platforms fp ON fp.id = i."fromPlatformId"
                    JOIN levels fl ON fl.id = fp."levelId"
                    JOIN platforms tp ON tp.id = i."toPlatformId"
                    WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
                      AND fl."stationId" = st.id AND tp."lineId" = l_sub.id
                  )
                  OR EXISTS (
                    SELECT 1 FROM interchanges i
                    JOIN platforms fp ON fp.id = i."fromPlatformId"
                    JOIN platforms tp ON tp.id = i."toPlatformId"
                    JOIN levels tl ON tl.id = tp."levelId"
                    WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
                      AND tl."stationId" = st.id AND fp."lineId" = l_sub.id
                  )
                  OR EXISTS (
                    SELECT 1 FROM stations same_stn
                    JOIN trips t_same ON true
                    JOIN stop_times st_same ON st_same."tripId" = t_same.id AND st_same."stationId" = same_stn.id
                    WHERE LOWER(TRIM(same_stn.name)) = LOWER(TRIM(st.name))
                      AND same_stn.city = st.city
                      AND same_stn."isActive" = true
                      AND t_same."lineId" = l_sub.id
                      AND t_same."isActive" = true
                      AND st_same."isActive" = true
                  )
                )
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
      feat.properties.lines = feat.properties.lines.map((line) => ({
        ...line,
        color: normalizeGtfsRouteColor(line.color),
      }));
      const primaryColor = feat.properties.lines[0]?.color;
      feat.properties.color = primaryColor;
      feat.properties.lineColor = primaryColor;
    } else {
      feat.properties.color = undefined;
      feat.properties.lineColor = undefined;
    }

    return feat as unknown as Record<string, unknown>;
  }

  /**
   * Serves indoor features (levels, platforms, entrances) for indoor mall-style zooming and level filtering.
   */
  async getStationIndoorGeoJson(
    stationId: string,
    levelFilter?: string,
  ): Promise<Record<string, unknown>> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        stationId,
      );
    const station = await this.prisma.station.findFirst({
      where: isUuid
        ? { id: stationId, isActive: true }
        : { code: stationId, isActive: true },
      include: {
        levels: { where: { isActive: true } },
        entrances: { where: { isActive: true } },
        towardsPlatforms: { where: { isActive: true } },
      },
    });

    if (!station) return this.wrapFeatureCollection([]);

    const features: Record<string, unknown>[] = [];

    // 1. Entrance Points (Location Type 2 - Street / Level 0)
    for (const ent of station.entrances) {
      features.push({
        type: 'Feature',
        id: `ent-${ent.id}`,
        geometry: {
          type: 'Point',
          coordinates: [ent.longitude, ent.latitude],
        },
        properties: {
          id: ent.id,
          name: ent.name,
          type: 'entrance',
          level_id: 'LVL_G',
          levelNumber: 0,
          levelName: 'Street Level',
          accessible: ent.accessible,
        },
      });
    }

    // 2. Platforms and Concourse levels
    const platforms = await this.prisma.platform.findMany({
      where: { level: { stationId: station.id }, isActive: true },
      include: {
        level: true,
        line: { select: { code: true, name: true, color: true } },
      },
    });

    for (const pf of platforms) {
      const lvlNum = pf.level?.levelNumber ?? 2;
      const lvlTag = lvlNum <= 0 ? 'LVL_G' : lvlNum === 1 ? 'LVL_L1' : 'LVL_L2';
      // Offset slightly for indoor visual differentiation if identical coords
      const offsetLat =
        parseInt(pf.platformNumber, 10) === 2 ? 0.00015 : -0.00015;

      features.push({
        type: 'Feature',
        id: `pf-${pf.id}`,
        geometry: {
          type: 'Point',
          coordinates: [station.longitude, station.latitude + offsetLat],
        },
        properties: {
          id: pf.id,
          name: `Platform ${pf.platformNumber} (${pf.line?.name || 'Line'})`,
          platformNumber: pf.platformNumber,
          type: 'platform',
          level_id: lvlTag,
          levelNumber: lvlNum,
          levelName: pf.level?.name || 'Platform Level',
          lineCode: pf.line?.code,
          lineColor: pf.line?.color,
        },
      });
    }

    // Optional level filtering
    let filteredFeatures = features;
    if (levelFilter) {
      const normalizedFilter = levelFilter.toUpperCase();
      filteredFeatures = features.filter((f: any) => {
        const lid = f.properties?.level_id;
        const lNum = f.properties?.levelNumber;
        if (normalizedFilter === 'G') return lid === 'LVL_G' || lNum === 0;
        if (normalizedFilter === 'L1') return lid === 'LVL_L1' || lNum === 1;
        if (normalizedFilter === 'L2')
          return lid === 'LVL_L2' || lNum >= 2 || lNum === -1;
        return lid === normalizedFilter;
      });
    }

    return this.wrapFeatureCollection(filteredFeatures, station.systemId);
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
