import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import {
  CanonicalAgency,
  CanonicalStation,
  CanonicalLine,
  CanonicalCalendar,
  CanonicalCalendarDate,
  CanonicalShape,
  CanonicalTrip,
  CanonicalStopTime,
  CanonicalFrequency,
} from '../types/domain.types';
import {
  LevelType,
  LineStatus,
  TractionType,
  SignallingType,
} from '@prisma/client';
import {
  GtfsLevelRow,
  GtfsStopRow,
  GtfsStopTimeRow,
  GtfsTripRow,
  GtfsTransferRow,
} from '../types/gtfs.types';

@Injectable()
export class TransitImporter {
  constructor(private readonly prisma: DatabaseService) {}

  private initStats(context: PipelineContext, key: string, processed: number) {
    context.stats[key] = {
      processed,
      inserted: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
    };
  }

  async importAgencies(
    context: PipelineContext,
    agencies: CanonicalAgency[],
  ): Promise<void> {
    this.initStats(context, 'Agency', agencies.length);
    if (agencies.length === 0) return;

    const codes = agencies.map((a) => a.code);
    const existing = await this.prisma.agency.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });

    const existingMap = new Map(existing.map((e) => [e.code, e.id]));
    const inserts: any[] = [];
    const updates: any[] = [];

    agencies.forEach((agency) => {
      if (existingMap.has(agency.code)) {
        updates.push(agency);
      } else {
        inserts.push(agency);
      }
    });

    context.stats['Agency'].inserted = inserts.length;
    context.stats['Agency'].updated = updates.length;

    if (context.dryRun) return;

    // Persist inserts
    if (inserts.length > 0) {
      await this.prisma.agency.createMany({
        data: inserts,
        skipDuplicates: true,
      });
    }

    // Persist updates
    for (const agency of updates) {
      await this.prisma.agency.update({
        where: { code: agency.code },
        data: {
          name: agency.name,
          website: agency.website,
          contactEmail: agency.contactEmail,
          phone: agency.phone,
        },
      });
    }
  }

  async importStations(
    context: PipelineContext,
    stations: CanonicalStation[],
  ): Promise<void> {
    this.initStats(context, 'Station', stations.length);
    if (stations.length === 0) return;

    const codes = stations.map((s) => s.code);
    const existing = await this.prisma.station.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });

    const existingMap = new Map(existing.map((e) => [e.code, e.id]));
    const inserts: any[] = [];
    const updates: any[] = [];

    stations.forEach((station) => {
      if (existingMap.has(station.code)) {
        updates.push(station);
      } else {
        inserts.push(station);
      }
    });

    context.stats['Station'].inserted = inserts.length;
    context.stats['Station'].updated = updates.length;

    if (context.dryRun) return;

    // Persist inserts
    if (inserts.length > 0) {
      // Query system to resolve dynamic city and state fallback
      const system = await this.prisma.system.findUnique({
        where: { id: context.systemId },
        select: { city: true },
      });
      const city = system?.city || 'Mumbai';
      const state =
        city.toLowerCase() === 'delhi'
          ? 'Delhi'
          : city.toLowerCase() === 'kochi'
            ? 'Kerala'
            : 'Maharashtra';

      const data = inserts.map((s) => ({
        systemId: context.systemId,
        code: s.code,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        timezone: s.timezone || 'Asia/Kolkata',
        city,
        state,
        country: 'India',
        wheelchairAccessible: s.wheelchairAccessible || false,
      }));

      await this.prisma.station.createMany({
        data,
        skipDuplicates: true,
      });
    }

    // Persist updates
    for (const station of updates) {
      await this.prisma.station.update({
        where: { code: station.code },
        data: {
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          timezone: station.timezone,
          wheelchairAccessible: station.wheelchairAccessible,
        },
      });
    }
  }

  async importLines(
    context: PipelineContext,
    lines: CanonicalLine[],
  ): Promise<void> {
    this.initStats(context, 'Line', lines.length);
    if (lines.length === 0) return;

    const codes = lines.map((l) => l.code);
    const existing = await this.prisma.line.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });

    const existingMap = new Map(existing.map((e) => [e.code, e.id]));
    const inserts: any[] = [];
    const updates: any[] = [];

    const agencies = await this.prisma.agency.findMany({
      select: { id: true, code: true },
    });
    const agencyCodeToId = new Map(agencies.map((a) => [a.code, a.id]));

    let assetOwner = await this.prisma.assetOwner.findFirst();
    if (!assetOwner) {
      assetOwner = await this.prisma.assetOwner.create({
        data: { code: 'DEFAULT_OWNER', name: 'Default Owner' },
      });
    }

    lines.forEach((line) => {
      if (existingMap.has(line.code)) {
        updates.push(line);
      } else {
        inserts.push(line);
      }
    });

    context.stats['Line'].inserted = inserts.length;
    context.stats['Line'].updated = updates.length;

    if (context.dryRun) return;

    // Persist inserts
    if (inserts.length > 0) {
      const data = inserts
        .map((l) => {
          const agencyId = agencyCodeToId.get(l.agencyCode) || agencies[0]?.id;
          return {
            systemId: context.systemId,
            agencyId: agencyId,
            assetOwnerId: assetOwner.id,
            code: l.code,
            name: l.name,
            color: l.color,
            status: LineStatus.ACTIVE,
            traction: TractionType.OTHER,
            signalling: SignallingType.MANUAL,
          };
        })
        .filter((d) => d.agencyId !== undefined);

      await this.prisma.line.createMany({
        data,
        skipDuplicates: true,
      });
    }

    // Persist updates
    for (const line of updates) {
      const agencyId = agencyCodeToId.get(line.agencyCode) || agencies[0]?.id;
      if (!agencyId) continue;

      await this.prisma.line.update({
        where: { code: line.code },
        data: {
          name: line.name,
          color: line.color,
          agencyId,
        },
      });
    }
  }

  async importCalendars(
    context: PipelineContext,
    calendars: CanonicalCalendar[],
  ): Promise<void> {
    this.initStats(context, 'Calendar', calendars.length);
    if (calendars.length === 0) return;

    const serviceIds = calendars.map((c) => c.serviceId);
    const existing = await this.prisma.calendar.findMany({
      where: { serviceId: { in: serviceIds } },
      select: { id: true, serviceId: true },
    });

    const existingMap = new Map(existing.map((e) => [e.serviceId, e.id]));
    const inserts: any[] = [];
    const updates: any[] = [];

    calendars.forEach((cal) => {
      if (existingMap.has(cal.serviceId)) {
        updates.push(cal);
      } else {
        inserts.push(cal);
      }
    });

    context.stats['Calendar'].inserted = inserts.length;
    context.stats['Calendar'].updated = updates.length;

    if (context.dryRun) return;

    if (inserts.length > 0) {
      const data = inserts.map((c) => ({
        systemId: context.systemId,
        serviceId: c.serviceId,
        monday: c.monday,
        tuesday: c.tuesday,
        wednesday: c.wednesday,
        thursday: c.thursday,
        friday: c.friday,
        saturday: c.saturday,
        sunday: c.sunday,
        startDate: c.startDate,
        endDate: c.endDate,
      }));

      await this.prisma.calendar.createMany({
        data,
        skipDuplicates: true,
      });
    }

    for (const cal of updates) {
      await this.prisma.calendar.update({
        where: { serviceId: cal.serviceId },
        data: {
          monday: cal.monday,
          tuesday: cal.tuesday,
          wednesday: cal.wednesday,
          thursday: cal.thursday,
          friday: cal.friday,
          saturday: cal.saturday,
          sunday: cal.sunday,
          startDate: cal.startDate,
          endDate: cal.endDate,
        },
      });
    }
  }

  async importCalendarDates(
    context: PipelineContext,
    dates: CanonicalCalendarDate[],
  ): Promise<void> {
    this.initStats(context, 'CalendarDate', dates.length);
    if (dates.length === 0) return;

    // Calendar exception dates can be cleared and fully re-inserted dynamically per run
    context.stats['CalendarDate'].inserted = dates.length;

    if (context.dryRun) return;

    // Resolve Calendar relations
    const calendars = await this.prisma.calendar.findMany({
      select: { id: true, serviceId: true },
    });
    const serviceToId = new Map(calendars.map((c) => [c.serviceId, c.id]));

    const data = dates
      .map((d) => {
        const calendarId = serviceToId.get(d.serviceId);
        if (!calendarId) return null;
        return {
          calendarId,
          date: d.date,
          exceptionType: d.exceptionType,
        };
      })
      .filter((d) => d !== null) as any[];

    // To prevent growing tables unboundedly, we clean up exceptions first
    const calendarIds = Array.from(new Set(data.map((d) => d.calendarId)));
    await this.prisma.calendarDate.deleteMany({
      where: { calendarId: { in: calendarIds } },
    });

    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
      await this.prisma.calendarDate.createMany({
        data: data.slice(i, i + chunkSize),
        skipDuplicates: true,
      });
    }
  }

  async importShapes(
    context: PipelineContext,
    shapes: CanonicalShape[],
  ): Promise<void> {
    this.initStats(context, 'Shape', shapes.length);
    if (shapes.length === 0) return;

    context.stats['Shape'].inserted = shapes.length;

    if (context.dryRun) return;

    // Purge shapes sharing the same shapeId to perform full clean replacement
    const shapeIds = Array.from(new Set(shapes.map((s) => s.shapeId)));
    await this.prisma.shape.deleteMany({
      where: { shapeId: { in: shapeIds } },
    });

    const data = shapes.map((s) => ({
      systemId: context.systemId,
      shapeId: s.shapeId,
      latitude: s.latitude,
      longitude: s.longitude,
      sequence: s.sequence,
      distTraveled: s.distTraveled,
    }));

    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
      await this.prisma.shape.createMany({
        data: data.slice(i, i + chunkSize),
        skipDuplicates: true,
      });
    }
  }

  async importTrips(
    context: PipelineContext,
    trips: CanonicalTrip[],
  ): Promise<void> {
    this.initStats(context, 'Trip', trips.length);
    if (trips.length === 0) return;

    const tripIds = trips.map((t) => t.tripId);
    const existing = await this.prisma.trip.findMany({
      where: { tripId: { in: tripIds } },
      select: { id: true, tripId: true },
    });

    const existingMap = new Map(existing.map((e) => [e.tripId, e.id]));
    const inserts: any[] = [];
    const updates: any[] = [];

    trips.forEach((trip) => {
      if (existingMap.has(trip.tripId)) {
        updates.push(trip);
      } else {
        inserts.push(trip);
      }
    });

    context.stats['Trip'].inserted = inserts.length;
    context.stats['Trip'].updated = updates.length;

    if (context.dryRun) return;

    const lines = await this.prisma.line.findMany({
      select: { id: true, code: true },
    });
    const lineCodeToId = new Map(lines.map((l) => [l.code, l.id]));

    if (inserts.length > 0) {
      const data = inserts
        .map((t) => {
          const lineId = lineCodeToId.get(t.lineCode);
          if (!lineId) return null;
          return {
            lineId,
            serviceId: t.serviceId,
            tripId: t.tripId,
            tripHeadsign: t.tripHeadsign,
            directionId: t.directionId,
            shapeId: t.shapeId,
          };
        })
        .filter((t) => t !== null) as any[];

      await this.prisma.trip.createMany({
        data,
        skipDuplicates: true,
      });
    }

    for (const trip of updates) {
      const lineId = lineCodeToId.get(trip.lineCode);
      if (!lineId) continue;

      await this.prisma.trip.update({
        where: { tripId: trip.tripId },
        data: {
          lineId,
          serviceId: trip.serviceId,
          tripHeadsign: trip.tripHeadsign,
          directionId: trip.directionId,
          shapeId: trip.shapeId,
        },
      });
    }
  }

  async importStopTimes(
    context: PipelineContext,
    stopTimes: CanonicalStopTime[],
  ): Promise<void> {
    this.initStats(context, 'StopTime', stopTimes.length);
    if (stopTimes.length === 0) return;

    context.stats['StopTime'].inserted = stopTimes.length;

    if (context.dryRun) return;

    // Resolve Trips and Stations
    const trips = await this.prisma.trip.findMany({
      select: { id: true, tripId: true },
    });
    const tripCodeToId = new Map(trips.map((t) => [t.tripId, t.id]));

    const stations = await this.prisma.station.findMany({
      select: { id: true, code: true },
    });
    const stationCodeToId = new Map(stations.map((s) => [s.code, s.id]));

    const data = stopTimes
      .map((st) => {
        const tripId = tripCodeToId.get(st.tripId);
        // Fallback for child stop ids: find parent station db id or match directly
        let stationId = stationCodeToId.get(st.stationCode);
        if (!stationId) {
          stationId = stationCodeToId.get(`ST_${st.stationCode}`);
        }

        if (!tripId || !stationId) return null;

        return {
          tripId,
          stationId,
          arrivalTime: st.arrivalTime,
          departureTime: st.departureTime,
          stopSequence: st.stopSequence,
          stopHeadsign: st.stopHeadsign,
          pickupType: st.pickupType || 0,
          dropOffType: st.dropOffType || 0,
        };
      })
      .filter((st) => st !== null) as any[];

    // Delete existing stop times for the trips we are about to import to ensure clean sequence
    const tripDbIds = Array.from(new Set(data.map((st) => st.tripId)));
    await this.prisma.stopTime.deleteMany({
      where: { tripId: { in: tripDbIds } },
    });

    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
      await this.prisma.stopTime.createMany({
        data: data.slice(i, i + chunkSize),
        skipDuplicates: true,
      });
    }
  }

  async importStationInfrastructure(
    context: PipelineContext,
    stops: GtfsStopRow[],
    feedLevels: GtfsLevelRow[],
    trips: GtfsTripRow[],
    stopTimes: GtfsStopTimeRow[],
    transfers: GtfsTransferRow[] = [],
  ): Promise<void> {
    const entranceRows = stops.filter((stop) => stop.location_type === '2');
    const platformRows = stops.filter(
      (stop) => stop.location_type === '0' && Boolean(stop.platform_code),
    );
    this.initStats(context, 'Level', feedLevels.length);
    this.initStats(context, 'Platform', platformRows.length);
    this.initStats(context, 'Entrance', entranceRows.length);
    this.initStats(context, 'Interchange', transfers.length);
    if (context.dryRun) return;

    let levelsInserted = 0;
    let levelsUpdated = 0;
    let platformsInserted = 0;
    let platformsUpdated = 0;
    let entrancesInserted = 0;
    let entrancesUpdated = 0;

    const stationCodes = Array.from(
      new Set(
        stops
          .filter((stop) => stop.location_type === '1' || stop.parent_station)
          .map((stop) => stop.parent_station || stop.stop_id),
      ),
    );
    const stations = await this.prisma.station.findMany({
      where: { systemId: context.systemId, code: { in: stationCodes } },
      select: { id: true, code: true },
    });
    const stationIds = stations.map((station) => station.id);
    if (stationIds.length === 0) return;

    const stationIdByCode = new Map(
      stations.map((station) => [station.code, station.id]),
    );
    const stationCodeForStop = new Map(
      stops.map((stop) => [stop.stop_id, stop.parent_station || stop.stop_id]),
    );

    // Replace the active physical records for this system with the current
    // feed snapshot. Historical rows remain inactive for auditability.
    await this.prisma.platform.updateMany({
      where: { level: { stationId: { in: stationIds } } },
      data: { isActive: false },
    });
    await this.prisma.level.updateMany({
      where: { stationId: { in: stationIds } },
      data: { isActive: false },
    });
    await this.prisma.entrance.updateMany({
      where: { stationId: { in: stationIds } },
      data: { isActive: false },
    });

    const levelById = new Map(
      feedLevels.map((level) => [level.level_id, level]),
    );
    const levelStationCode = new Map<string, string>();
    for (const stop of stops) {
      if (stop.level_id && levelById.has(stop.level_id)) {
        const stationCode = stationCodeForStop.get(stop.stop_id);
        if (stationCode && stationIdByCode.has(stationCode)) {
          levelStationCode.set(stop.level_id, stationCode);
        }
      }
    }

    const levelDbId = new Map<string, string>();
    for (const [levelCode, stationCode] of levelStationCode) {
      const stationId = stationIdByCode.get(stationCode);
      const level = levelById.get(levelCode);
      if (!stationId || !level) continue;

      const name = level.level_name || `Level ${level.level_index}`;
      const nameUpper = name.toUpperCase();
      const type: LevelType = nameUpper.includes('PLATFORM')
        ? 'PLATFORM'
        : nameUpper.includes('CONCOURSE')
          ? 'CONCOURSE'
          : nameUpper.includes('STREET') || nameUpper.includes('GROUND')
            ? 'STREET'
            : nameUpper.includes('BASEMENT')
              ? 'BASEMENT'
              : nameUpper.includes('MEZZANINE')
                ? 'MEZZANINE'
                : 'OTHER';
      const sourceId = `GTFS:${context.systemId}:${levelCode}`;
      const existing = await this.prisma.level.findFirst({
        where: { stationId, sourceId },
        select: { id: true },
      });
      const levelData = {
        stationId,
        lineId: null,
        sourceId,
        evidenceStatus: 'GTFS_STATIC',
        name,
        levelNumber: Math.round(Number(level.level_index)),
        type,
        isActive: true,
      };
      const saved = existing
        ? await this.prisma.level.update({
            where: { id: existing.id },
            data: levelData,
            select: { id: true },
          })
        : await this.prisma.level.create({
            data: levelData,
            select: { id: true },
          });
      if (existing) levelsUpdated++;
      else levelsInserted++;
      levelDbId.set(`${stationCode}\u0000${levelCode}`, saved.id);
    }

    const routeByTrip = new Map(
      trips.map((trip) => [trip.trip_id, trip.route_id]),
    );
    const routeCodesByStop = new Map<string, Set<string>>();
    for (const stopTime of stopTimes) {
      const routeCode = routeByTrip.get(stopTime.trip_id);
      if (!routeCode) continue;
      const routeCodes =
        routeCodesByStop.get(stopTime.stop_id) ?? new Set<string>();
      routeCodes.add(routeCode);
      routeCodesByStop.set(stopTime.stop_id, routeCodes);
    }
    const routeCodes = Array.from(
      new Set(
        Array.from(routeCodesByStop.values()).flatMap((codes) => [...codes]),
      ),
    );
    const lines = await this.prisma.line.findMany({
      where: { systemId: context.systemId, code: { in: routeCodes } },
      select: { id: true, code: true },
    });
    const lineIdByCode = new Map(lines.map((line) => [line.code, line.id]));

    const timesByTrip = new Map<string, GtfsStopTimeRow[]>();
    const stopById = new Map(stops.map((stop) => [stop.stop_id, stop]));
    for (const stopTime of stopTimes) {
      const tripTimes = timesByTrip.get(stopTime.trip_id) ?? [];
      tripTimes.push(stopTime);
      timesByTrip.set(stopTime.trip_id, tripTimes);
    }
    const towardsByPlatformLine = new Map<string, Set<string>>();
    for (const trip of trips) {
      const lineId = lineIdByCode.get(trip.route_id);
      const tripTimes = timesByTrip.get(trip.trip_id);
      if (!lineId || !tripTimes?.length) continue;
      tripTimes.sort(
        (a, b) => Number(a.stop_sequence) - Number(b.stop_sequence),
      );
      const terminalStopId = tripTimes[tripTimes.length - 1].stop_id;
      const terminalStationCode = stationCodeForStop.get(terminalStopId);
      const terminalStationId = terminalStationCode
        ? stationIdByCode.get(terminalStationCode)
        : undefined;
      if (!terminalStationId) continue;

      for (const stopTime of tripTimes) {
        const stop = stopById.get(stopTime.stop_id);
        if (!stop?.platform_code) continue;
        const key = `${stop.stop_id}\u0000${lineId}`;
        const destinations =
          towardsByPlatformLine.get(key) ?? new Set<string>();
        destinations.add(terminalStationId);
        towardsByPlatformLine.set(key, destinations);
      }
    }

    for (const stop of stops) {
      if (stop.location_type === '2') {
        const stationCode = stationCodeForStop.get(stop.stop_id);
        const candidateStationId = stationCode
          ? stationIdByCode.get(stationCode)
          : null;
        if (!candidateStationId) continue;

        // Double check station actually exists in database to satisfy foreign key
        const validStation = await this.prisma.station.findUnique({
          where: { id: candidateStationId },
          select: { id: true },
        });
        if (!validStation) continue;
        const stationId = validStation.id;

        const existingEntrances = await this.prisma.entrance.findMany({
          where: { stationId, name: stop.stop_name },
          select: { id: true, latitude: true, longitude: true },
        });
        const existing = existingEntrances.find(
          (entrance) =>
            Math.abs(entrance.latitude - Number(stop.stop_lat)) < 0.000001 &&
            Math.abs(entrance.longitude - Number(stop.stop_lon)) < 0.000001,
        );
        const entranceData = {
          stationId,
          name: stop.stop_name,
          latitude: Number(stop.stop_lat),
          longitude: Number(stop.stop_lon),
          accessible: stop.wheelchair_boarding === '1',
          isActive: true,
        };
        if (existing) {
          await this.prisma.entrance.update({
            where: { id: existing.id },
            data: entranceData,
          });
          entrancesUpdated++;
        } else {
          await this.prisma.entrance.create({ data: entranceData });
          entrancesInserted++;
        }
        continue;
      }

      if (stop.location_type !== '0' || !stop.platform_code || !stop.level_id) {
        continue;
      }
      const stationCode = stationCodeForStop.get(stop.stop_id);
      if (!stationCode) continue;
      const stationId = stationIdByCode.get(stationCode);
      const levelId = levelDbId.get(`${stationCode}\u0000${stop.level_id}`);
      if (!stationId || !levelId) continue;

      for (const routeCode of routeCodesByStop.get(stop.stop_id) ?? []) {
        const lineId = lineIdByCode.get(routeCode);
        if (!lineId) continue;
        const sourceId = `GTFS:${context.systemId}:${stop.stop_id}:${lineId}`;
        const existing = await this.prisma.platform.findFirst({
          where: { sourceId, level: { stationId } },
          select: { id: true },
        });
        const platformData = {
          levelId,
          lineId,
          towardsStationId: (() => {
            const destinations = towardsByPlatformLine.get(
              `${stop.stop_id}\u0000${lineId}`,
            );
            return destinations?.size === 1 ? [...destinations][0] : null;
          })(),
          sourceId,
          evidenceStatus: 'GTFS_STATIC',
          platformNumber: stop.platform_code,
          wheelchairBoarding: stop.wheelchair_boarding === '1',
          isActive: true,
        };
        if (existing) {
          await this.prisma.platform.update({
            where: { id: existing.id },
            data: platformData,
          });
          platformsUpdated++;
        } else {
          await this.prisma.platform.create({ data: platformData });
          platformsInserted++;
        }
      }
    }

    await this.importGtfsTransfers(
      context,
      stops,
      transfers,
      stationIdByCode,
      stationCodeForStop,
      stationIds,
    );

    context.stats.Level.inserted = levelsInserted;
    context.stats.Level.updated = levelsUpdated;
    context.stats.Platform.inserted = platformsInserted;
    context.stats.Platform.updated = platformsUpdated;
    context.stats.Entrance.inserted = entrancesInserted;
    context.stats.Entrance.updated = entrancesUpdated;
    context.logger.log(
      `GTFS station infrastructure imported: ${levelsInserted + levelsUpdated} levels, ${platformsInserted + platformsUpdated} platforms, ${entrancesInserted + entrancesUpdated} entrances.`,
    );
  }

  private async importGtfsTransfers(
    context: PipelineContext,
    stops: GtfsStopRow[],
    transfers: GtfsTransferRow[],
    stationIdByCode: Map<string, string>,
    stationCodeForStop: Map<string, string>,
    stationIds: string[],
  ): Promise<void> {
    if (transfers.length === 0) return;

    const platforms = await this.prisma.platform.findMany({
      where: { level: { stationId: { in: stationIds } } },
      select: {
        id: true,
        lineId: true,
        wheelchairBoarding: true,
        isActive: true,
        sourceId: true,
        level: { select: { stationId: true } },
      },
    });
    const platformIds = platforms.map((platform) => platform.id);
    if (platformIds.length > 0) {
      await this.prisma.interchange.updateMany({
        where: {
          OR: [
            { fromPlatformId: { in: platformIds } },
            { toPlatformId: { in: platformIds } },
          ],
        },
        data: { isActive: false },
      });
    }

    const activePlatforms = platforms.filter((platform) => platform.isActive);
    const platformsByStation = new Map<string, typeof activePlatforms>();
    for (const platform of activePlatforms) {
      const stationPlatforms =
        platformsByStation.get(platform.level.stationId) ?? [];
      stationPlatforms.push(platform);
      platformsByStation.set(platform.level.stationId, stationPlatforms);
    }

    const stopById = new Map(stops.map((stop) => [stop.stop_id, stop]));
    const platformPrefix = `GTFS:${context.systemId}:`;
    const platformForTransferStop = (stopId: string, stationId: string) => {
      const stop = stopById.get(stopId);
      if (stop?.platform_code) {
        const sourcePrefix = `${platformPrefix}${stopId}:`;
        const matching = activePlatforms.filter((platform) =>
          platform.sourceId?.startsWith(sourcePrefix),
        );
        if (matching.length > 0) return matching;
      }
      return platformsByStation.get(stationId) ?? [];
    };

    const stationRows = await this.prisma.station.findMany({
      where: { id: { in: stationIds } },
      select: { id: true, latitude: true, longitude: true },
    });
    const stationCoordinates = new Map(
      stationRows.map((station) => [station.id, station]),
    );
    const transferPairs = new Map<
      string,
      {
        fromPlatformId: string;
        toPlatformId: string;
        walkingDistance: number;
        walkingTime: number;
        accessible: boolean;
      }
    >();

    for (const transfer of transfers) {
      if (Number(transfer.transfer_type) === 3) continue;
      const fromCode =
        stationCodeForStop.get(transfer.from_stop_id) ?? transfer.from_stop_id;
      const toCode =
        stationCodeForStop.get(transfer.to_stop_id) ?? transfer.to_stop_id;
      const fromStationId = fromCode
        ? stationIdByCode.get(fromCode)
        : undefined;
      const toStationId = toCode ? stationIdByCode.get(toCode) : undefined;
      if (!fromStationId || !toStationId || fromStationId === toStationId)
        continue;

      const fromPlatforms = platformForTransferStop(
        transfer.from_stop_id,
        fromStationId,
      );
      const toPlatforms = platformForTransferStop(
        transfer.to_stop_id,
        toStationId,
      );
      const fromCoordinate = stationCoordinates.get(fromStationId);
      const toCoordinate = stationCoordinates.get(toStationId);
      if (!fromCoordinate || !toCoordinate) continue;

      const radians = (degrees: number) => (degrees * Math.PI) / 180;
      const latitudeDelta = radians(
        toCoordinate.latitude - fromCoordinate.latitude,
      );
      const longitudeDelta = radians(
        toCoordinate.longitude - fromCoordinate.longitude,
      );
      const haversine =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(radians(fromCoordinate.latitude)) *
          Math.cos(radians(toCoordinate.latitude)) *
          Math.sin(longitudeDelta / 2) ** 2;
      const walkingDistance =
        6371000 *
        2 *
        Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
      const walkingTime = Math.max(
        0,
        Number.parseInt(transfer.min_transfer_time ?? '0', 10) || 0,
      );

      for (const fromPlatform of fromPlatforms) {
        for (const toPlatform of toPlatforms) {
          if (fromPlatform.lineId === toPlatform.lineId) continue;
          const key = `${fromPlatform.id}\u0000${toPlatform.id}`;
          transferPairs.set(key, {
            fromPlatformId: fromPlatform.id,
            toPlatformId: toPlatform.id,
            walkingDistance,
            walkingTime,
            accessible:
              fromPlatform.wheelchairBoarding === true &&
              toPlatform.wheelchairBoarding === true,
          });
        }
      }
    }

    let inserted = 0;
    let updated = 0;
    for (const pair of transferPairs.values()) {
      const existing = await this.prisma.interchange.findFirst({
        where: {
          fromPlatformId: pair.fromPlatformId,
          toPlatformId: pair.toPlatformId,
        },
        select: { id: true },
      });
      const data = { ...pair, verticalMovement: false, isActive: true };
      if (existing) {
        await this.prisma.interchange.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await this.prisma.interchange.create({ data });
        inserted++;
      }
    }
    context.stats.Interchange.inserted = inserted;
    context.stats.Interchange.updated = updated;
    context.stats.Interchange.processed = transferPairs.size;
  }

  async importFrequencies(
    context: PipelineContext,
    frequencies: CanonicalFrequency[],
  ): Promise<void> {
    this.initStats(context, 'Frequency', frequencies.length);
    if (frequencies.length === 0) return;

    context.stats['Frequency'].inserted = frequencies.length;

    if (context.dryRun) return;

    const trips = await this.prisma.trip.findMany({
      select: { id: true, tripId: true },
    });
    const tripCodeToId = new Map(trips.map((t) => [t.tripId, t.id]));

    const data = frequencies
      .map((f) => {
        const tripId = tripCodeToId.get(f.tripId);
        if (!tripId) return null;

        return {
          tripId,
          startTime: f.startTime,
          endTime: f.endTime,
          headwaySecs: f.headwaySecs,
          exactTimes: f.exactTimes || 0,
        };
      })
      .filter((f) => f !== null) as any[];

    const tripDbIds = Array.from(new Set(data.map((f) => f.tripId)));
    await this.prisma.frequency.deleteMany({
      where: { tripId: { in: tripDbIds } },
    });

    await this.prisma.frequency.createMany({
      data,
      skipDuplicates: true,
    });
  }
}
