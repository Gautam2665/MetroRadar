import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { SearchService } from '../../gis/services/search.service';
import { LandmarkRegistry } from '../../gis/services/landmark-registry';

export interface ResolvedStation {
  id: string;
  code: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  confidence: number;
  isPoi?: boolean;
  poiName?: string;
  walkDistanceMeters?: number;
}

// Common commuter colloquialisms, aliases, and abbreviations in Mumbai & Delhi
const COMMUTER_ALIASES: Record<string, string> = {
  // Mumbai
  weh: 'Western Express Highway',
  'w.e.h': 'Western Express Highway',
  'w.e.h.': 'Western Express Highway',
  dn: 'D.N. Nagar',
  dnnagar: 'D.N. Nagar',
  'd.n. nagar': 'D.N. Nagar',
  csmt: 'Chhatrapati Shivaji Maharaj Terminus',
  cst: 'Chhatrapati Shivaji Maharaj Terminus',
  vt: 'Chhatrapati Shivaji Maharaj Terminus',
  bkc: 'Bandra Kurla Complex',
  airport: 'Chhatrapati Shivaji Maharaj International Airport (T2)',
  'airport t2': 'Chhatrapati Shivaji Maharaj International Airport (T2)',
  'airport t1': 'Chhatrapati Shivaji Maharaj International Airport (T1)',
  t2: 'Chhatrapati Shivaji Maharaj International Airport (T2)',
  t1: 'Chhatrapati Shivaji Maharaj International Airport (T1)',
  'domestic airport': 'Chhatrapati Shivaji Maharaj International Airport (T1)',
  'international airport':
    'Chhatrapati Shivaji Maharaj International Airport (T2)',
  borivali: 'Borivali',
  'borivali west': 'Borivali',
  'andheri west': 'Andheri West',
  andheri: 'Andheri',
  ghatkopar: 'Ghatkopar',
  gundavali: 'Gundavali',
  marol: 'Marol Naka',
  marolnaka: 'Marol Naka',
  versova: 'Versova',
  dahisar: 'Dahisar East',
  'dahisar east': 'Dahisar East',
  // Delhi
  cp: 'Rajiv Chowk',
  'connaught place': 'Rajiv Chowk',
  'rajiv chowk': 'Rajiv Chowk',
  huda: 'Millennium City Centre Gurugram',
  'huda city centre': 'Millennium City Centre Gurugram',
  kashmere: 'Kashmere Gate',
  'kashmere gate': 'Kashmere Gate',
  aiims: 'AIIMS',
  hauz: 'Hauz Khas',
  'hauz khas': 'Hauz Khas',
};

function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .replace(/metro/gi, '')
    .replace(/station/gi, '')
    .replace(/railway/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

@Injectable()
export class StationResolverService {
  private readonly logger = new Logger(StationResolverService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Resolves a user-spoken or typed station query into an exact Station record.
   * Leverages alias mapping, SQL ILIKE, and Levenshtein distance fallback.
   */
  async resolveStation(
    rawQuery: string,
    cityHint?: string,
  ): Promise<ResolvedStation | null> {
    if (
      !rawQuery ||
      typeof rawQuery !== 'string' ||
      rawQuery.trim().length === 0
    ) {
      return null;
    }

    const trimmed = rawQuery
      .replace(/[?!.,;:"'()]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const cleanLower = trimmed
      .toLowerCase()
      .replace(/metro\s+station/gi, '')
      .trim();

    // 1. Direct UUID match check
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );
    if (isUuid) {
      const direct = await this.prisma.station.findUnique({
        where: { id: trimmed },
        select: {
          id: true,
          code: true,
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      });
      if (direct) {
        return { ...direct, confidence: 1.0 };
      }
    }

    // 2. Direct Landmark Registry Check (e.g. Oberoi Sky City, Infiniti Mall, BKC)
    const registeredLm = LandmarkRegistry.findByNameOrAlias(trimmed);
    if (registeredLm) {
      const stn = await this.prisma.station.findFirst({
        where: {
          code: registeredLm.connectedStationCode,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      });
      if (stn) {
        this.logger.log(
          `Resolved landmark "${trimmed}" to connected station "${stn.name}" (${stn.code}) via LandmarkRegistry`,
        );
        return {
          ...stn,
          confidence: 0.98,
          isPoi: true,
          poiName: registeredLm.name,
          walkDistanceMeters: registeredLm.walkDistanceMeters || 180,
        };
      }
    }

    // 3. Check Commuter Alias lookup table
    let searchQuery = cleanLower;
    if (COMMUTER_ALIASES[cleanLower]) {
      searchQuery = COMMUTER_ALIASES[cleanLower].toLowerCase();
    }

    // 4. Exact Code or Name Match in Database
    const exactMatch = await this.prisma.station.findFirst({
      where: {
        isActive: true,
        ...(cityHint
          ? { city: { equals: cityHint, mode: 'insensitive' } }
          : {}),
        OR: [
          { name: { equals: searchQuery, mode: 'insensitive' } },
          { code: { equals: searchQuery, mode: 'insensitive' } },
          { name: { equals: trimmed, mode: 'insensitive' } },
          { code: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        latitude: true,
        longitude: true,
      },
    });

    if (exactMatch) {
      return { ...exactMatch, confidence: 1.0 };
    }

    // 5. Try SearchService (Google Places API + Landmark snapping)
    // Checks if the user mentioned a locality, colony, cafe, college, hospital, or landmark
    try {
      const searchRes = (await this.searchService.search(trimmed, [
        'station',
        'landmark',
      ])) as any;
      if (
        searchRes &&
        Array.isArray(searchRes.features) &&
        searchRes.features.length > 0
      ) {
        // Look for POIs or exact station results
        const poiOrStation = searchRes.features.find((f: any) => {
          const p = f.properties || {};
          return (
            (p.type === 'poi' || p.isLandmark) &&
            (p.stationId || p.nearestStation?.id || p.id)
          );
        });

        if (poiOrStation && poiOrStation.properties) {
          const props = poiOrStation.properties;
          const targetStnId = props.stationId || props.nearestStation?.id;
          let stn: {
            id: string;
            code: string;
            name: string;
            city: string;
            latitude: number;
            longitude: number;
          } | null = null;

          if (targetStnId) {
            stn = await this.prisma.station.findUnique({
              where: { id: targetStnId },
              select: {
                id: true,
                code: true,
                name: true,
                city: true,
                latitude: true,
                longitude: true,
              },
            });
          }

          if (!stn && props.code) {
            stn = await this.prisma.station.findFirst({
              where: { code: props.code, isActive: true },
              select: {
                id: true,
                code: true,
                name: true,
                city: true,
                latitude: true,
                longitude: true,
              },
            });
          }

          if (
            !stn &&
            typeof props.id === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              props.id,
            )
          ) {
            stn = await this.prisma.station.findUnique({
              where: { id: props.id },
              select: {
                id: true,
                code: true,
                name: true,
                city: true,
                latitude: true,
                longitude: true,
              },
            });
          }

          if (stn) {
            this.logger.log(
              `Snapped locality/POI "${trimmed}" to nearest station "${stn.name}" via Places API (${props.displayName || props.name})`,
            );
            return {
              ...stn,
              confidence: 0.95,
              isPoi: true,
              poiName: props.name || trimmed,
              walkDistanceMeters:
                props.landmarkDetails?.walkDistanceMeters || 250,
            };
          }
        }
      }
    } catch (searchErr) {
      this.logger.warn(
        `SearchService lookup error for "${trimmed}": ${searchErr}`,
      );
    }

    // 5. Substring ILIKE search with ranking
    const formattedLike = `%${searchQuery}%`;
    const candidates = await this.prisma.station.findMany({
      where: {
        isActive: true,
        ...(cityHint
          ? { city: { equals: cityHint, mode: 'insensitive' } }
          : {}),
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { code: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        latitude: true,
        longitude: true,
      },
      take: 10,
    });

    if (candidates.length > 0) {
      // Sort candidates by length closeness to searchQuery
      const bestSubstring = candidates.sort(
        (a, b) =>
          Math.abs(a.name.length - searchQuery.length) -
          Math.abs(b.name.length - searchQuery.length),
      )[0];
      return { ...bestSubstring, confidence: 0.85 };
    }

    // 6. Fallback: Fuzzy Levenshtein Search across active stations
    const allStations = await this.prisma.station.findMany({
      where: {
        isActive: true,
        ...(cityHint
          ? { city: { equals: cityHint, mode: 'insensitive' } }
          : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        latitude: true,
        longitude: true,
      },
    });

    const targetNorm = normalizeName(searchQuery);
    let bestFuzzy: ResolvedStation | null = null;
    let minDistance = Infinity;

    for (const station of allStations) {
      const stationNorm = normalizeName(station.name);
      if (
        stationNorm.includes(targetNorm) ||
        targetNorm.includes(stationNorm)
      ) {
        return { ...station, confidence: 0.8 };
      }
      const dist = levenshteinDistance(targetNorm, stationNorm);
      if (dist < minDistance) {
        minDistance = dist;
        bestFuzzy = { ...station, confidence: 0 };
      }
    }

    // Allow threshold if edit distance is small relative to string length
    if (
      bestFuzzy &&
      minDistance <= Math.max(3, Math.floor(targetNorm.length * 0.35))
    ) {
      const confidence = Math.max(
        0.4,
        1 - minDistance / Math.max(targetNorm.length, 1),
      );
      return { ...bestFuzzy, confidence };
    }

    this.logger.warn(
      `Could not resolve station for query "${rawQuery}" (cityHint: ${cityHint || 'none'})`,
    );
    return null;
  }
}
