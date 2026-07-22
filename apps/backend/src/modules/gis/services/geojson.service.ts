import { Injectable } from '@nestjs/common';
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
  systemId: string;
  wheelchairAccessible: boolean;
  lines: StationLine[];
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
               WHERE sh."shapeId" = s."shapeId"
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
      const nameUpper = (feat.properties.name || '').toUpperCase();
      let color = feat.properties.color || '#3b82f6';

      // Remap invalid or generic database black/white/null colors to their true route line hex codes
      if (
        color === '' ||
        ['#000000', '000000', '#ffffff', 'ffffff'].includes(color.toLowerCase())
      ) {
        if (nameUpper.includes('YELLOW') || nameUpper.includes('LINE 2A')) {
          color = '#facc15'; // Vibrant Yellow
        } else if (nameUpper.includes('BLUE')) {
          color = '#3b82f6'; // Royal Blue
        } else if (nameUpper.includes('PINK')) {
          color = '#ec4899'; // Hot Pink
        } else if (nameUpper.includes('MAGENTA')) {
          color = '#d946ef'; // Magenta
        } else if (nameUpper.includes('RED')) {
          color = '#ef4444'; // Red
        } else if (nameUpper.includes('VIOLET')) {
          color = '#8b5cf6'; // Violet
        } else if (nameUpper.includes('GREEN')) {
          color = '#22c55e'; // Green
        } else if (nameUpper.includes('AQUA')) {
          color = '#06b6d4'; // Aqua/Cyan
        } else if (
          nameUpper.includes('ORANGE') ||
          nameUpper.includes('AIRPORT')
        ) {
          color = '#f97316'; // Orange Express
        } else if (nameUpper.includes('RAPID')) {
          color = '#14b8a6'; // Rapid Teal
        } else if (nameUpper.includes('KOCHI')) {
          color = '#0ea5e9'; // Kochi Sky Blue
        } else {
          color = '#3b82f6'; // Default Blue
        }
      }

      feat.properties.color = color;
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
            'systemId', st."systemId",
            'wheelchairAccessible', st."wheelchairAccessible",
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
            'systemId', st."systemId",
            'wheelchairAccessible', st."wheelchairAccessible",
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
    }

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
