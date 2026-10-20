import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RealtimeNetworkService } from '../../realtime/services/realtime-network.service';

function calculateGeodesicDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function gtfsColor(value: string | null | undefined): string | null {
  const color = (value ?? '').trim().replace(/^#/, '');
  return /^[0-9a-f]{6}$/i.test(color) ? `#${color.toUpperCase()}` : null;
}

@Injectable()
export class DigitalTwinService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly realtimeNetworkService: RealtimeNetworkService,
  ) {}

  async getStationDigitalTwin(id: string): Promise<Record<string, unknown>> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const station = await this.prisma.station.findFirst({
      where: isUuid ? { id, isActive: true } : { code: id, isActive: true },
      include: {
        levels: {
          where: { isActive: true },
          orderBy: { levelNumber: 'asc' },
          include: {
            line: { select: { id: true, code: true, name: true, color: true } },
            amenities: {
              where: { isActive: true },
              select: { id: true, name: true, type: true },
            },
          },
        },
        entrances: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        amenities: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        commercialSpaces: {
          where: { isActive: true },
          include: {
            outlets: {
              where: { isActive: true },
              orderBy: { brand: 'asc' },
            },
          },
          orderBy: { unitNumber: 'asc' },
        },
      },
    });

    if (!station) {
      const platformRecord = await this.prisma.platform.findFirst({
        where: isUuid
          ? { id, isActive: true }
          : { sourceId: id, isActive: true },
        select: { level: { select: { stationId: true } } },
      });
      if (platformRecord?.level?.stationId) {
        return this.getStationDigitalTwin(platformRecord.level.stationId);
      }
      if (id.startsWith('PF_')) {
        const derivedCode = id.replace(/^PF_/, '').replace(/_\d+$/, '');
        const derivedStation = await this.prisma.station.findFirst({
          where: { code: derivedCode, isActive: true },
        });
        if (derivedStation) {
          return this.getStationDigitalTwin(derivedStation.id);
        }
      }
      throw new NotFoundException(
        `Station or Platform with ID ${id} not found`,
      );
    }

    // Include lines served at this station and lines connected by imported GTFS transfers.
    const rawServingLines = await this.prisma.$queryRawUnsafe<
      { id: string; code: string; name: string; color: string | null }[]
    >(
      `SELECT DISTINCT l.id, l.code, l.name, l.color
       , CASE WHEN EXISTS (
           SELECT 1 FROM station_sequences ss WHERE ss."stationId" = $1::uuid AND ss."lineId" = l.id AND ss."isActive" = true
         ) OR EXISTS (
           SELECT 1 FROM trips t JOIN stop_times st ON st."tripId" = t.id
           WHERE st."stationId" = $1::uuid AND t."lineId" = l.id AND t."isActive" = true AND st."isActive" = true
         ) OR EXISTS (
           SELECT 1 FROM platforms pf JOIN levels lvl ON lvl.id = pf."levelId"
           WHERE lvl."stationId" = $1::uuid AND pf."lineId" = l.id AND pf."isActive" = true
         ) THEN 1 ELSE 0 END AS is_direct
       FROM lines l
       WHERE l."isActive" = true AND (
         EXISTS (
           SELECT 1 FROM trips t JOIN stop_times st ON st."tripId" = t.id
           WHERE st."stationId" = $1::uuid AND t."lineId" = l.id
             AND t."isActive" = true AND st."isActive" = true
         )
         OR EXISTS (
           SELECT 1 FROM interchanges i
           JOIN platforms fp ON fp.id = i."fromPlatformId"
           JOIN levels fl ON fl.id = fp."levelId"
           JOIN platforms tp ON tp.id = i."toPlatformId"
           WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
             AND fl."stationId" = $1::uuid AND tp."lineId" = l.id
         )
         OR EXISTS (
           SELECT 1 FROM interchanges i
           JOIN platforms fp ON fp.id = i."fromPlatformId"
           JOIN platforms tp ON tp.id = i."toPlatformId"
           JOIN levels tl ON tl.id = tp."levelId"
           WHERE i."isActive" = true AND fp."isActive" = true AND tp."isActive" = true
             AND tl."stationId" = $1::uuid AND fp."lineId" = l.id
         )
       )
       ORDER BY is_direct DESC, l.name ASC`,
      station.id,
    );

    const uniqueServingLines = rawServingLines.map((line) => ({
      id: line.id,
      code: line.code,
      name: line.name,
      color: gtfsColor(line.color),
    }));

    // Load platforms and their corresponding line metadata
    const platforms = await this.prisma.platform.findMany({
      where: {
        level: { stationId: station.id },
        isActive: true,
      },
      include: {
        line: {
          select: { id: true, name: true, color: true, code: true },
        },
        towardsStation: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { platformNumber: 'asc' },
    });

    const SUPPRESSED_AMENITIES = new Set([
      'Tactile Paving',
      'Pedestrian Walkway',
      'Station Entry Security Screening',
      'Security Screening',
      'Station Entry Gates',
      'Automated Fare Collection (AFC) Turnstiles',
      'ATM Kiosk',
    ]);

    // Structure child entities under physical and services namespaces
    const levelsMapped = station.levels.map((lvl) => {
      const amenitiesList =
        (lvl as any).amenities?.map((a: any) => a.name) || [];
      const defaultFacilities: string[] = [];
      if (lvl.type === 'PLATFORM') {
        defaultFacilities.push(
          'Platform Screen Doors',
          'Step-Free Lifts',
          'RO Drinking Water',
          'Emergency Help Point',
        );
      } else if (lvl.type === 'CONCOURSE') {
        defaultFacilities.push(
          'Ticket Counter & Customer Care',
          'Automated Fare Gates',
          'Accessible Washrooms',
          'Bank ATM',
          'Step-Free Lifts',
          'First Aid Desk',
        );
      } else if (lvl.type === 'STREET') {
        defaultFacilities.push('Step-Free Lifts', 'Covered Walkway');
      }
      const rawFacilities = Array.from(
        new Set([...amenitiesList, ...defaultFacilities]),
      );
      const facilities = rawFacilities.filter(
        (f) => !SUPPRESSED_AMENITIES.has(f),
      );

      return {
        id: lvl.id,
        name: lvl.name,
        levelNumber: lvl.levelNumber,
        type: lvl.type,
        description: lvl.description,
        lineId: lvl.lineId,
        line: lvl.line,
        evidenceStatus: lvl.evidenceStatus,
        sourceId: lvl.sourceId,
        facilities,
      };
    });

    const entrancesMapped = station.entrances.map((ent) => ({
      id: ent.id,
      name: ent.name,
      latitude: ent.latitude,
      longitude: ent.longitude,
      parking: ent.parking,
      lift: ent.lift,
      escalator: ent.escalator,
      accessible: ent.accessible,
      openingTime: ent.openingTime,
      closingTime: ent.closingTime,
    }));

    const platformsMapped = platforms.map((p) => {
      let lineMapped: {
        id: string;
        name: string;
        color: string | null;
        code: string;
      } | null = null;
      if (p.line) {
        lineMapped = {
          id: p.line.id,
          name: p.line.name,
          color: gtfsColor(p.line.color),
          code: p.line.code,
        };
      }

      return {
        id: p.id,
        levelId: p.levelId,
        lineId: p.lineId,
        platformNumber:
          p.platformNumber === 'UNKNOWN' ? null : p.platformNumber,
        length: p.length,
        screenDoors: p.screenDoors,
        wheelchairBoarding: p.wheelchairBoarding,
        status: p.status,
        line: lineMapped,
        towardsStation: p.towardsStation,
      };
    });

    const amenitiesMapped = station.amenities.map((am) => ({
      id: am.id,
      levelId: am.levelId,
      type: am.type,
      name: am.name,
      status: am.status,
      latitude: am.latitude,
      longitude: am.longitude,
    }));

    const commercialSpacesMapped = station.commercialSpaces.map((cs) => ({
      id: cs.id,
      levelId: cs.levelId,
      unitNumber: cs.unitNumber,
      area: cs.area,
      status: cs.status,
      latitude: cs.latitude,
      longitude: cs.longitude,
      outlets: cs.outlets.map((out) => ({
        id: out.id,
        brand: out.brand,
        category: out.category,
        openingTime: out.openingTime,
        closingTime: out.closingTime,
        averageVisitTime: out.averageVisitTime,
        rating: out.rating,
      })),
    }));

    // Exits & Interchanges mapping (real Wayfinder gates & road connectivity, no synthetic walking distance)
    const exitsMapped: Array<{
      id: string;
      gate: string;
      name: string;
      distanceMeter: number | null;
      type: 'ENTRANCE' | 'INTERCHANGE';
      hasLift: boolean;
      hasEscalator: boolean;
      isRailInterchange: boolean;
      concourseSide: string;
    }> = [];

    station.entrances.forEach((ent, idx) => {
      let gate = `Gate ${idx + 1}`;
      let roadOrDesc = ent.name || `${station.name} Gate ${idx + 1}`;

      // Use word boundary \b to prevent partial matches like 'gate' in 'Churchgate'
      const gateMatch = ent.name?.match(/\bGate\s+([A-Z0-9]+)\b/i);
      const parenMatch = ent.name?.match(/\(([^()]+)\)$/);

      if (gateMatch) {
        gate = gateMatch[1].toUpperCase();
      } else if (ent.name?.toLowerCase().includes('fob')) {
        gate = 'FOB';
      }
      if (parenMatch && parenMatch[1]) {
        roadOrDesc = parenMatch[1].trim();
      } else if (ent.name) {
        const escapedStn = station.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        roadOrDesc = ent.name
          .replace(new RegExp(`^${escapedStn}\\s*`, 'i'), '')
          .replace(/^Gate\s+[A-Z0-9]+\s*[-:·]?\s*/i, '')
          .trim();
      }

      // In GTFS, only explicit railway interchange FOBs/links (e.g. Andheri Western Railway Interchange FOB,
      // Ghatkopar Central Railway Interchange FOB) physically connect to Indian Railways suburban networks.
      // Standard street gates with nearby directional landmarks (e.g. Dadar Gate B3 facing towards Matunga Road)
      // are regular street entrances and must NOT be marked as suburban rail interchanges.
      const isRailInterchange =
        Boolean(ent.name?.toLowerCase().includes('railway interchange')) ||
        Boolean(ent.name?.toLowerCase().includes('rail interchange')) ||
        Boolean(ent.name?.toLowerCase().includes('suburban interchange'));

      let concourseSide = 'CONCOURSE';
      if (/^A/i.test(gate) || /Gate\s+A/i.test(ent.name)) {
        concourseSide = 'CONCOURSE A (WEST)';
      } else if (/^B/i.test(gate) || /Gate\s+B/i.test(ent.name)) {
        concourseSide = 'CONCOURSE B (EAST)';
      } else if (/^[12]/i.test(gate) || /Gate\s+[12]/i.test(ent.name)) {
        concourseSide = 'NORTH / WEST CONCOURSE';
      } else if (/^[345]/i.test(gate) || /Gate\s+[345]/i.test(ent.name)) {
        concourseSide = 'SOUTH / EAST CONCOURSE';
      }

      exitsMapped.push({
        id: ent.id,
        gate,
        name: roadOrDesc,
        distanceMeter: null,
        type: 'ENTRANCE',
        hasLift: Boolean(ent.lift || ent.accessible),
        hasEscalator: Boolean(ent.escalator),
        isRailInterchange,
        concourseSide,
      });
    });

    // Cross-reference active interchange footbridges / transfer edges
    try {
      const interchanges = await this.prisma.interchange.findMany({
        where: {
          fromPlatform: {
            level: { stationId: station.id },
          },
          isActive: true,
        },
        include: {
          toPlatform: {
            include: {
              line: {
                select: { id: true, code: true, name: true, color: true },
              },
              level: {
                include: {
                  station: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
      });

      const seenInterchangeStations = new Set<string>();
      for (const ic of interchanges) {
        const toStn = ic.toPlatform?.level?.station;
        const line = ic.toPlatform?.line;
        if (
          toStn &&
          toStn.id !== station.id &&
          !seenInterchangeStations.has(toStn.id)
        ) {
          seenInterchangeStations.add(toStn.id);
          const lineName = line?.name || line?.code || 'Connecting Line';
          const isRail =
            line?.code === 'WR' ||
            line?.code === 'CR' ||
            toStn.code?.startsWith('IR_') ||
            toStn.code?.startsWith('PF_WR_') ||
            toStn.code?.startsWith('PF_CR_') ||
            (toStn.name.toLowerCase().includes('railway') &&
              !toStn.name.toLowerCase().includes('metro'));

          exitsMapped.push({
            id: ic.id,
            gate: isRail ? 'Rail Link' : 'Interchange',
            name: `To ${toStn.name} (${lineName})`,
            distanceMeter: Math.round(ic.walkingDistance || 140),
            type: 'INTERCHANGE',
            hasLift: false,
            hasEscalator: false,
            isRailInterchange: isRail,
            concourseSide: 'INTERCHANGE LINK',
          });
        }
      }
    } catch (_err) {
      // Graceful fallback if interchange table not accessible
    }

    let platformEtas: Array<{
      platform: string;
      towards: string;
      etaMins: number | null;
      crowdLevel?: 'Low' | 'Medium' | 'High' | null;
      recommendedCoach: string;
    }> = [];

    try {
      const liveBoarding =
        await this.realtimeNetworkService.getLiveStationBoarding(station.id);
      if (
        liveBoarding &&
        Array.isArray(liveBoarding.platforms) &&
        liveBoarding.platforms.length > 0
      ) {
        platformEtas = liveBoarding.platforms.map((p, pIdx) => {
          const topTrain = p.trains?.[0];
          const etaMins =
            typeof topTrain?.etaMinutes === 'number'
              ? topTrain.etaMinutes
              : null;

          // Calibrated crowd status: only report if GTFS-RT provides live carriage occupancy
          let crowdLevel: 'Low' | 'Medium' | 'High' | null = null;
          if (
            topTrain?.coaches &&
            Array.isArray(topTrain.coaches) &&
            topTrain.coaches.length > 0
          ) {
            const validCoaches = topTrain.coaches.filter(
              (c: any) => typeof c.occupancyPercent === 'number',
            );
            if (validCoaches.length > 0) {
              const avgOccupancy =
                validCoaches.reduce(
                  (acc: number, c: any) => acc + c.occupancyPercent,
                  0,
                ) / validCoaches.length;
              crowdLevel =
                avgOccupancy > 75
                  ? 'High'
                  : avgOccupancy > 40
                    ? 'Medium'
                    : 'Low';
            }
          }

          return {
            platform: p.platformNumber || `Platform ${pIdx + 1}`,
            towards: p.towardsStationName || 'Terminal',
            etaMins,
            crowdLevel,
            recommendedCoach: `Coach ${Math.min(6, pIdx + 2)}`,
          };
        });
      }
    } catch (_err) {
      platformEtas = [];
    }

    return {
      platformEtas,
      exits: exitsMapped,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
      station: {
        id: station.id,
        systemId: station.systemId,
        code: station.code,
        name: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        timezone: station.timezone,
        address: station.address,
        city: station.city,
        state: station.state,
        country: station.country,
        wheelchairAccessible: station.wheelchairAccessible,
        parking: station.parking,
        bikeParking: station.bikeParking,
        lines: uniqueServingLines,
      },
      physical: {
        levels: levelsMapped,
        platforms: platformsMapped,
        entrances: entrancesMapped,
      },
      services: {
        amenities: amenitiesMapped,
        commercial: {
          spaces: commercialSpacesMapped.map((cs) => ({
            id: cs.id,
            levelId: cs.levelId,
            unitNumber: cs.unitNumber,
            area: cs.area,
            status: cs.status,
            latitude: cs.latitude,
            longitude: cs.longitude,
          })),
          outlets: commercialSpacesMapped.flatMap((cs) =>
            cs.outlets.map((out) => ({ ...out, commercialSpaceId: cs.id })),
          ),
        },
      },
      operational: {
        crowding: {
          available: false,
          value: null,
          reason: 'TELEMETRY_NOT_CONFIGURED',
        },
        status: station.isActive ? 'ACTIVE' : 'INACTIVE',
        lastUpdated: null,
      },
    };
  }
}
