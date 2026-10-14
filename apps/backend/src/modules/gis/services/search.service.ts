import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { DatabaseService } from '../../../database/database.service';
import { GeojsonService, GeoJsonRawResult } from './geojson.service';
import { LandmarkRegistry } from './landmark-registry';

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
    const strippedQuery = `%${query.replace(/[^a-zA-Z0-9]/g, '')}%`;
    const features: Record<string, unknown>[] = [];

    // 0. Search landmarks with direct FOB & concourse connections
    if (
      !filterTypes ||
      filterTypes.includes('station') ||
      filterTypes.includes('landmark')
    ) {
      const matchingLandmarks = LandmarkRegistry.search(query);
      for (const lm of matchingLandmarks) {
        const stationRecord = await this.prisma.station.findFirst({
          where: { code: lm.connectedStationCode, isActive: true },
          select: { id: true, systemId: true, city: true },
        });

        features.push({
          type: 'Feature',
          id: lm.id,
          geometry: {
            type: 'Point',
            coordinates: lm.coordinates,
          },
          properties: {
            id: stationRecord?.id || lm.id,
            code: lm.connectedStationCode,
            name: lm.name,
            displayName: `${lm.name} (${lm.hasDirectFob ? 'Direct FOB to ' : ''}${lm.connectedStationName})`,
            address:
              lm.corridorNote || `${lm.connectedStationName} precinct, Mumbai`,
            type: 'poi',
            isLandmark: true,
            city: stationRecord?.city || 'mumbai',
            systemId: stationRecord?.systemId || '',
            lines: [
              {
                code: lm.connectedLineCode,
                name: lm.connectedLineName,
                color: lm.connectedLineColor,
              },
            ],
            lineColor: lm.connectedLineColor,
            nearestStation: {
              id: stationRecord?.id,
              name: lm.connectedStationName,
              lineName: lm.connectedLineName,
              lineColor: lm.connectedLineColor,
              walkDistance: lm.hasDirectFob
                ? 'Direct FOB'
                : lm.walkDistanceMeters
                  ? `${lm.walkDistanceMeters}m`
                  : undefined,
            },
            landmarkDetails: {
              landmarkId: lm.id,
              name: lm.name,
              category: lm.category,
              connectedStationCode: lm.connectedStationCode,
              connectedStationName: lm.connectedStationName,
              hasDirectFob: lm.hasDirectFob,
              hasDirectAccess: lm.hasDirectAccess,
              directFobName: lm.directFobName,
              walkDistanceMeters: lm.walkDistanceMeters,
              walkTimeSeconds: lm.walkTimeSeconds,
              corridorNote: lm.corridorNote,
              indoorLevel: lm.indoorLevel,
            },
          },
        });
      }
    }

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
                  WHERE st_sub."stationId" = st.id AND l_sub."isActive" = true AND t_sub."isActive" = true AND st_sub."isActive" = true
                  UNION
                  SELECT DISTINCT l_sub2.id, l_sub2.code, l_sub2.name, l_sub2.color
                  FROM lines l_sub2
                  JOIN station_sequences ss_sub ON ss_sub."lineId" = l_sub2.id
                  WHERE ss_sub."stationId" = st.id AND l_sub2."isActive" = true
                  UNION
                  SELECT DISTINCT l_sub3.id, l_sub3.code, l_sub3.name, l_sub3.color
                  FROM lines l_sub3
                  JOIN platforms tp ON tp."lineId" = l_sub3.id
                  JOIN interchanges i ON i."toPlatformId" = tp.id
                  JOIN platforms fp ON fp.id = i."fromPlatformId"
                  JOIN levels fl ON fl.id = fp."levelId"
                  WHERE fl."stationId" = st.id AND i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true AND l_sub3."isActive" = true
                  UNION
                  SELECT DISTINCT l_sub4.id, l_sub4.code, l_sub4.name, l_sub4.color
                  FROM lines l_sub4
                  JOIN platforms fp ON fp."lineId" = l_sub4.id
                  JOIN interchanges i ON i."fromPlatformId" = fp.id
                  JOIN platforms tp ON tp.id = i."toPlatformId"
                  JOIN levels tl ON tl.id = tp."levelId"
                  WHERE tl."stationId" = st.id AND i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true AND l_sub4."isActive" = true
                  UNION
                  SELECT DISTINCT l_sub5.id, l_sub5.code, l_sub5.name, l_sub5.color
                  FROM lines l_sub5
                  JOIN trips t_same ON t_same."lineId" = l_sub5.id
                  JOIN stop_times st_same ON st_same."tripId" = t_same.id
                  JOIN stations same_stn ON same_stn.id = st_same."stationId"
                  WHERE LOWER(TRIM(same_stn.name)) = LOWER(TRIM(st.name))
                    AND same_stn.city = st.city
                    AND same_stn."isActive" = true
                    AND t_same."isActive" = true
                    AND st_same."isActive" = true
                    AND l_sub5."isActive" = true
                ) l
              ), '[]'::json)
            )
          ) as feature
        FROM stations st
        WHERE st."isActive" = true AND (
          st.name ILIKE $1 
          OR st.code ILIKE $1 
          OR st.city ILIKE $1
          OR REGEXP_REPLACE(st.name, '[^a-zA-Z0-9]', '', 'g') ILIKE $2
          OR (
            SELECT string_agg(substring(word from 1 for 1), '')
            FROM regexp_split_to_table(st.name, '\\s+') AS word
            WHERE word ~ '^[a-zA-Z]'
          ) ILIKE $1
        )
        LIMIT 100;
      `,
        formattedQuery,
        strippedQuery,
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

    // 4. Dynamic Geocoding & Closest Station Snapping (Google Maps Platform + Photon Fallback)
    // If user typed a locality/landmark (e.g. "Evershine Nagar", "Irla", "Hanuman Mandir Vile Parle", "Mithibai College")
    const cleanQ = query.trim();
    if (
      cleanQ.length >= 3 &&
      (!filterTypes ||
        filterTypes.includes('station') ||
        filterTypes.includes('landmark'))
    ) {
      try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const candidatePlaces: Array<{
          name: string;
          lat: number;
          lon: number;
          address?: string;
        }> = [];

        // 1. Try Official Google Places API (New) if key configured
        if (apiKey) {
          try {
            const googleRes = await axios.post(
              'https://places.googleapis.com/v1/places:searchText',
              {
                textQuery: `${cleanQ} Mumbai`,
                locationBias: {
                  rectangle: {
                    low: { latitude: 18.89, longitude: 72.75 },
                    high: { latitude: 19.32, longitude: 73.05 },
                  },
                },
                maxResultCount: 4,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-Goog-Api-Key': apiKey,
                  'X-Goog-FieldMask':
                    'places.displayName,places.formattedAddress,places.location',
                },
                timeout: 3000,
              },
            );

            if (Array.isArray(googleRes.data?.places)) {
              for (const p of googleRes.data.places) {
                if (p.location?.latitude && p.location?.longitude) {
                  candidatePlaces.push({
                    name: p.displayName?.text || cleanQ,
                    address: p.formattedAddress || 'Mumbai, Maharashtra',
                    lat: p.location.latitude,
                    lon: p.location.longitude,
                  });
                }
              }
            }
          } catch (gErr) {
            // Fall back to Photon if Google request fails or quota reached
          }
        }

        // 2. Photon fallback if Google yielded 0 places
        if (candidatePlaces.length === 0) {
          try {
            const geoUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ + ', Mumbai')}&limit=3`;
            const geoRes = await axios.get(geoUrl, { timeout: 3000 });
            if (geoRes.data && Array.isArray(geoRes.data.features)) {
              for (const item of geoRes.data.features) {
                const coords = item.geometry?.coordinates as [number, number];
                if (coords && coords.length >= 2) {
                  const props = item.properties || {};
                  const addrParts = [
                    props.street,
                    props.district,
                    props.city || 'Mumbai',
                  ].filter(Boolean);
                  candidatePlaces.push({
                    name: props.name || cleanQ,
                    address:
                      addrParts.length > 0
                        ? addrParts.join(', ')
                        : 'Mumbai, Maharashtra',
                    lon: coords[0],
                    lat: coords[1],
                  });
                }
              }
            }
          } catch (pErr) {
            // Silently ignore photon failure
          }
        }

        for (const item of candidatePlaces) {
          const placeName = item.name;
          const { lat, lon } = item;

          // Find closest active station in DB using PostGIS ST_Distance
          const nearestStn = await this.prisma.$queryRawUnsafe<any[]>(
            `
            SELECT 
              st.id, st.code, st.name, st.latitude, st.longitude, st.city, st."systemId",
              ST_Distance(COALESCE(st.geom, ST_SetSRID(ST_MakePoint(st.longitude, st.latitude), 4326))::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance,
              COALESCE((
                SELECT json_agg(json_build_object('code', l.code, 'name', l.name, 'color', COALESCE(l.color, '#00e5ff')))
                FROM lines l
                JOIN station_sequences ss ON ss."lineId" = l.id
                WHERE ss."stationId" = st.id AND l."isActive" = true
              ), '[]'::json) as lines
            FROM stations st
            WHERE st."isActive" = true AND LOWER(st.city) IN ('mumbai', 'mm')
              AND (st.geom IS NOT NULL OR (st.latitude IS NOT NULL AND st.longitude IS NOT NULL))
            ORDER BY distance ASC
            LIMIT 1;
            `,
            lat,
            lon,
          );

          if (nearestStn && nearestStn.length > 0) {
            const stn = nearestStn[0];
            const distM = Math.round(stn.distance);
            const lines = Array.isArray(stn.lines) ? stn.lines : [];
            const primaryLine = lines[0] || {
              code: 'MM',
              name: 'Mumbai Metro',
              color: '#06b6d4',
            };

            // Avoid duplicate if feature with same id/name already present
            const alreadyExists = features.some((f: any) =>
              f.properties?.name
                ?.toLowerCase()
                .includes(placeName.toLowerCase()),
            );

            if (!alreadyExists) {
              features.push({
                type: 'Feature',
                id: `place-${placeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                geometry: {
                  type: 'Point',
                  coordinates: [lon, lat],
                },
                properties: {
                  id: stn.id, // Snaps directly to closest station ID for 1-click route planning!
                  code: stn.code,
                  name: placeName,
                  displayName: `${placeName} (Nearest Metro: ${stn.name} · ~${distM}m)`,
                  address: item.address || `${stn.name} vicinity, Mumbai`,
                  type: 'poi',
                  isLandmark: true,
                  city: 'mumbai',
                  systemId: stn.systemId,
                  lines: lines.map((l: any) => ({
                    code: l.code,
                    name: l.name,
                    color: resolveLineColor(l.color ?? '', l.name ?? ''),
                  })),
                  lineColor: resolveLineColor(
                    primaryLine.color ?? '',
                    primaryLine.name ?? '',
                  ),
                  nearestStation: {
                    id: stn.id,
                    name: stn.name,
                    lineName: primaryLine.name,
                    lineColor: resolveLineColor(
                      primaryLine.color ?? '',
                      primaryLine.name ?? '',
                    ),
                    walkDistance: `${distM}m`,
                  },
                  landmarkDetails: {
                    name: placeName,
                    address: item.address || 'Mumbai, Maharashtra',
                    connectedStationCode: stn.code,
                    connectedStationName: stn.name,
                    hasDirectFob: distM <= 50,
                    hasDirectAccess: distM <= 50,
                    walkDistanceMeters: distM,
                    walkTimeSeconds: Math.round(distM * 1.2),
                    corridorNote: `Board/Deboard at ${stn.name}. Distance to ${placeName}: approx ${distM}m.`,
                    indoorLevel: 'Street / Concourse Level',
                  },
                },
              });
            }
          }
        }
      } catch (err: any) {
        // Silently continue if external geocoder times out
      }
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
