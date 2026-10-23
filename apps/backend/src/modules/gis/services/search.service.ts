import { Injectable } from '@nestjs/common';
import axios from 'axios';
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

// Mumbai Metro Service Area Boundary Polygon
// Cuts off at Thane Creek in the east and Dahisar/Mira-Bhayandar in the north, excluding Navi Mumbai
const MUMBAI_METRO_BOUNDARY: [number, number][] = [
  [18.88, 72.78], // South Colaba tip
  [18.98, 72.94], // Docklands / Wadala
  [19.04, 72.94], // Chembur / Mankhurd edge (before Thane Creek Bridge)
  [19.06, 72.92], // Kurla / Ghatkopar East
  [19.16, 72.96], // Bhandup / Mulund west of railway
  [19.26, 72.98], // Thane City boundary
  [19.3, 72.88], // Mira-Bhayandar / Kashigaon
  [19.3, 72.82], // Western coast Dahisar/Borivali
  [19.18, 72.78], // Malad / Versova / Juhu coast
  [18.88, 72.78], // Loop closed
];

function isWithinMumbaiMetroServiceArea(lat: number, lon: number): boolean {
  let inside = false;
  let j = MUMBAI_METRO_BOUNDARY.length - 1;
  for (let i = 0; i < MUMBAI_METRO_BOUNDARY.length; i++) {
    const [latI, lonI] = MUMBAI_METRO_BOUNDARY[i];
    const [latJ, lonJ] = MUMBAI_METRO_BOUNDARY[j];
    const intersect =
      lonI > lon !== lonJ > lon &&
      lat < ((latJ - latI) * (lon - lonI)) / (lonJ - lonI) + latI;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

@Injectable()
export class SearchService {
  private readonly searchCache = new Map<
    string,
    { timestamp: number; data: Record<string, unknown> }
  >();

  constructor(
    private readonly prisma: DatabaseService,
    private readonly geojsonService: GeojsonService,
  ) {}

  async search(
    query: string,
    filterTypes?: string[],
  ): Promise<Record<string, unknown>> {
    const cleanQ = query.trim();
    if (!cleanQ) {
      return this.geojsonService.wrapFeatureCollection([]);
    }

    const cacheKey = `${cleanQ.toLowerCase()}:${(filterTypes || []).join(',')}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      // 5 min cache
      return cached.data;
    }

    const formattedQuery = `%${cleanQ}%`;
    const prefixQuery = `${cleanQ}%`;
    const strippedQuery = `%${cleanQ.replace(/[^a-zA-Z0-9]/g, '')}%`;
    const features: Record<string, unknown>[] = [];

    // 1. Search stations (Highest priority: actual metro stations)
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
                FROM lines l
                JOIN station_sequences ss ON ss."lineId" = l.id
                WHERE ss."stationId" = st.id AND l."isActive" = true
              ), '[]'::json)
            )
          ) as feature
        FROM stations st
        WHERE st."isActive" = true AND (
          st.name ILIKE $1 
          OR st.code ILIKE $1 
          OR st.city ILIKE $1
          OR REGEXP_REPLACE(st.name, '[^a-zA-Z0-9]', '', 'g') ILIKE $2
        )
        ORDER BY 
          CASE 
            WHEN st.name ILIKE $3 THEN 1 
            WHEN st.name ILIKE $1 THEN 2 
            ELSE 3 
          END,
          LENGTH(st.name) ASC
        LIMIT 25;
      `,
        formattedQuery,
        strippedQuery,
        prefixQuery,
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

    // 4. Dynamic Geocoding & Closest Station Snapping (Google Places + Photon Fallback)
    // If user typed a locality/landmark (e.g. "Irla", "Thakur Village", "Oberoi Mall", "Marina Enclave")
    if (
      cleanQ.length >= 3 &&
      (!filterTypes ||
        filterTypes.includes('station') ||
        filterTypes.includes('landmark'))
    ) {
      try {
        const candidatePlaces: Array<{
          name: string;
          lat: number;
          lon: number;
          address?: string;
        }> = [];

        // Geocode if there is no exact station name match and fewer than 5 station results
        const hasExactStationMatch = features.some(
          (f: any) =>
            f.properties?.type === 'station' &&
            asPrimitiveString(f.properties?.name).toLowerCase() ===
              cleanQ.toLowerCase(),
        );

        if (!hasExactStationMatch && features.length < 5) {
          const apiKey = process.env.GOOGLE_MAPS_API_KEY;

          // 1. Try Official Google Places API if key configured
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
                  maxResultCount: 3,
                },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask':
                      'places.displayName,places.formattedAddress,places.location',
                  },
                  timeout: 1500,
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
              // Fall back to Photon
            }
          }

          // 2. Photon fallback with tight 1500ms timeout
          if (candidatePlaces.length === 0) {
            try {
              const geoUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ + ', Mumbai')}&limit=3`;
              const geoRes = await axios.get(geoUrl, { timeout: 1500 });
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
        }

        for (const item of candidatePlaces) {
          const placeName = item.name;
          const { lat, lon } = item;

          // Find closest stations using high-performance PostGIS distance
          const nearestRows = await this.prisma.$queryRawUnsafe<any[]>(
            `
            SELECT 
              st.id, st.code, st.name, st.latitude, st.longitude, st.city, st."systemId",
              ST_Distance(
                COALESCE(st.geom, ST_SetSRID(ST_MakePoint(st.longitude, st.latitude), 4326))::geography,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
              ) as distance,
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
            LIMIT 15;
            `,
            lat,
            lon,
          );

          if (nearestRows && nearestRows.length > 0) {
            // Deduplicate stations, keeping the entrance with minimum distance
            const stationsById = new Map<string, any>();
            for (const row of nearestRows) {
              if (!stationsById.has(row.id)) {
                stationsById.set(row.id, row);
              } else {
                const existing = stationsById.get(row.id);
                if (row.distance < existing.distance) {
                  stationsById.set(row.id, row);
                }
              }
            }
            const sortedStations = Array.from(stationsById.values()).sort(
              (a, b) => a.distance - b.distance,
            );

            // Boundary Gate: Check if point falls within Mumbai Metropolitan Region
            const isInsideBoundary = isWithinMumbaiMetroServiceArea(lat, lon);
            const MAX_METRO_CATCHMENT_METERS = 25000; // Expanded to entire MMR so localities are never artificially limited
            const closestDistM = Math.round(sortedStations[0].distance);

            if (!isInsideBoundary && closestDistM > MAX_METRO_CATCHMENT_METERS) {
              const placeId = `${lat.toFixed(5)},${lon.toFixed(5)}`;
              // Out of metro network coverage: do not hijack a distant station
              features.push({
                type: 'Feature',
                id: placeId,
                geometry: {
                  type: 'Point',
                  coordinates: [lon, lat],
                },
                properties: {
                  id: placeId,
                  code: 'OUT',
                  name: placeName,
                  displayName: `${placeName} (Outside Mumbai Metro Coverage)`,
                  address: item.address || 'Outside active metro corridor',
                  type: 'poi',
                  isLandmark: true,
                  isOutOfCoverage: true,
                  coverageNotice:
                    'Outside active Mumbai Metro network (Navi Mumbai / MMR)',
                  city: 'mumbai',
                  systemId: '',
                  lines: [],
                  lineColor: '#64748b',
                  nearestStation: undefined,
                  landmarkDetails: {
                    name: placeName,
                    address: item.address || 'MMR / Navi Mumbai',
                    walkDistanceMeters: closestDistM,
                    corridorNote: `Nearest active metro station (${sortedStations[0].name}) is ~${Math.round(closestDistM / 1000)} km away, outside walking catchment.`,
                  },
                },
              });
            } else {
              // Aggregate serving lines across nearby stations within catchment (for visual pills)
              const MAX_FEEDER_RADIUS_METERS = Math.max(3800, closestDistM * 1.5);
              const nearbyCatchmentStations = sortedStations.filter(
                (stn) => stn.distance <= MAX_FEEDER_RADIUS_METERS,
              );
              const servingStations =
                nearbyCatchmentStations.length > 0
                  ? nearbyCatchmentStations
                  : [sortedStations[0]];

              const seenLineCodes = new Set<string>();
              const aggregatedLines: any[] = [];
              for (const stn of servingStations) {
                const lines = Array.isArray(stn.lines) ? stn.lines : [];
                for (const l of lines) {
                  if (!seenLineCodes.has(l.code)) {
                    seenLineCodes.add(l.code);
                    aggregatedLines.push({
                      code: l.code,
                      name: l.name,
                      color: resolveLineColor(l.color ?? '', l.name ?? ''),
                    });
                  }
                }
              }

              const primaryLine = aggregatedLines[0] || {
                code: 'MM',
                name: 'Mumbai Metro',
                color: '#06b6d4',
              };

              const closestStn = sortedStations[0];
              const isWalking = closestDistM <= 1200;
              const distDisplay = isWalking
                ? `~${closestDistM}m walk`
                : `~${(closestDistM / 1000).toFixed(1)} km via Auto/Bus`;

              const placeId = `${lat.toFixed(5)},${lon.toFixed(5)}`;

              // Only emit a single clean place feature (no pre-snapped station)
              if (!features.some((f: any) => f.id === placeId)) {
                features.push({
                  type: 'Feature',
                  id: placeId,
                  geometry: {
                    type: 'Point',
                    coordinates: [lon, lat],
                  },
                  properties: {
                    id: placeId,
                    placeId,
                    name: placeName,
                    displayName: placeName,
                    address: item.address || 'Mumbai, Maharashtra',
                    type: 'poi',
                    isLandmark: true,
                    isOutOfCoverage: false,
                    city: 'mumbai',
                    systemId: closestStn.systemId,
                    lines: aggregatedLines,
                    lineColor: primaryLine.color,
                    lat,
                    lng: lon,
                    landmarkDetails: {
                      name: placeName,
                      address: item.address || 'Mumbai, Maharashtra',
                      walkDistanceMeters: closestDistM,
                      corridorNote: `Multi-corridor transit access (${distDisplay})`,
                      indoorLevel: 'Street Level',
                    },
                  },
                });
              }
            }
          }
        }
      } catch (err: any) {
        // Silently continue if external geocoder times out
      }
    }

    // 5. Search GTFS Entrances / Wayfinding Gates (ONLY when user explicitly searches for a gate/exit/fob)
    const isExplicitGateSearch =
      /\b(gate|exit|entrance|entry|fob|skywalk)\b/i.test(query);

    if (
      isExplicitGateSearch &&
      (!filterTypes ||
        filterTypes.includes('station') ||
        filterTypes.includes('landmark'))
    ) {
      try {
        const matchingEntrances = await this.prisma.entrance.findMany({
          where: {
            isActive: true,
            name: { contains: query, mode: 'insensitive' },
          },
          include: {
            station: {
              select: {
                id: true,
                code: true,
                name: true,
                city: true,
                systemId: true,
                sequences: {
                  where: { isActive: true },
                  select: {
                    line: { select: { code: true, name: true, color: true } },
                  },
                },
              },
            },
          },
          take: 4,
        });

        for (const ent of matchingEntrances) {
          const stn = ent.station;
          if (!stn) continue;
          const gateMatch = ent.name.match(/(Gate\s+[A-Za-z0-9]+)/i);
          const gateLabel = gateMatch ? gateMatch[1] : 'Gate';
          const parenMatch = ent.name.match(/\((.+?)\)/);
          const landmarkName = parenMatch ? parenMatch[1].trim() : ent.name;

          const lines = (stn.sequences || [])
            .map((s) => s.line)
            .filter(Boolean);
          const primaryLine = lines[0] || {
            code: 'MM',
            name: 'Mumbai Metro',
            color: '#06b6d4',
          };

          features.push({
            type: 'Feature',
            id: ent.id,
            geometry: {
              type: 'Point',
              coordinates: [ent.longitude, ent.latitude],
            },
            properties: {
              id: ent.id,
              entranceId: ent.id,
              stationId: stn.id,
              code: stn.code,
              name: `${landmarkName} (${gateLabel})`,
              displayName: `${landmarkName} (${stn.name} · ${gateLabel})`,
              address: `${ent.name}, ${stn.name}, Mumbai`,
              type: 'poi',
              isEntrance: true,
              isLandmark: true,
              city: stn.city || 'mumbai',
              systemId: stn.systemId,
              lines: lines.map((l) => ({
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
                walkDistance: 'Station Gate',
                nearestGate: ent.name,
                gateCode: gateLabel,
              },
            },
          });
        }
      } catch {
        // Fallback gracefully
      }
    }

    const result = this.geojsonService.wrapFeatureCollection(features);
    this.searchCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
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
