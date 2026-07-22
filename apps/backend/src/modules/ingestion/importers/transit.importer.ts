/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

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
import { LineStatus, TractionType, SignallingType } from '@prisma/client';

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
