import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

@Injectable()
export class DigitalTwinService {
  constructor(private readonly prisma: DatabaseService) {}

  async getStationDigitalTwin(id: string): Promise<Record<string, unknown>> {
    const station = await this.prisma.station.findUnique({
      where: { id, isActive: true },
      include: {
        levels: {
          where: { isActive: true },
          orderBy: { levelNumber: 'asc' },
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
      throw new NotFoundException(`Station with ID ${id} not found`);
    }

    // Load lines serving this station via trips and stop_times (reliable for all systems)
    const rawServingLines = await this.prisma.$queryRawUnsafe<
      { id: string; code: string; name: string; color: string | null }[]
    >(
      `SELECT DISTINCT l.id, l.code, l.name, l.color
       FROM lines l
       JOIN trips t ON t."lineId" = l.id
       JOIN stop_times st ON st."tripId" = t.id
       WHERE st."stationId" = $1::uuid
         AND l."isActive" = true
       ORDER BY l.name`,
      id,
    );

    // Map and normalize colors (e.g. replace black/white/null with visible blue)
    const servingLines = rawServingLines.map((l) => {
      const nameUpper = (l.name || '').toUpperCase();
      let color = l.color || '#3b82f6';
      if (
        color === '' ||
        ['#000000', '000000', '#ffffff', 'ffffff'].includes(color.toLowerCase())
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
      return {
        id: l.id,
        code: l.code,
        name: l.name,
        color,
      };
    });

    // Load platforms and their corresponding line metadata
    const platforms = await this.prisma.platform.findMany({
      where: {
        level: { stationId: id },
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

    // Structure child entities under physical and services namespaces
    const levelsMapped = station.levels.map((lvl) => ({
      id: lvl.id,
      name: lvl.name,
      levelNumber: lvl.levelNumber,
      type: lvl.type,
      description: lvl.description,
    }));

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
      let lineMapped = null;
      if (p.line) {
        const nameUpper = (p.line.name || '').toUpperCase();
        let color = p.line.color || '#3b82f6';
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
        lineMapped = {
          id: p.line.id,
          name: p.line.name,
          color,
          code: p.line.code,
        };
      }

      return {
        id: p.id,
        levelId: p.levelId,
        lineId: p.lineId,
        platformNumber: p.platformNumber,
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

    return {
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
        lines: servingLines,
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
