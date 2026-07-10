/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync } from 'child_process';
import {
  LineStatus,
  TractionType,
  SignallingType,
  LevelType,
} from '@prisma/client';

@Injectable()
export class GtfsService {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Helper: Extract ZIP using system native extraction (tar utility on Windows/Linux)
   */
  async unzipGtfs(zipPath: string, destDir: string): Promise<string> {
    if (!fs.existsSync(zipPath)) {
      throw new Error(`GTFS ZIP file not found at: ${zipPath}`);
    }
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    try {
      // Native extraction: tar works on Win 10/11 and Linux
      console.log(`Extracting ${zipPath} to ${destDir}...`);
      execSync(`tar -xf "${zipPath}" -C "${destDir}"`, { stdio: 'ignore' });
      await Promise.resolve();
      return destDir;
    } catch (error) {
      throw new Error(
        `Failed to extract GTFS ZIP: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Parser: Stream CSV line-by-line with O(1) memory footprint
   */
  async parseCsvFile(
    filePath: string,
    onRow: (row: Record<string, string>) => Promise<void>,
  ): Promise<void> {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let headers: string[] = [];
    let isFirstLine = true;

    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        headers = this.parseCsvLine(line);
        continue;
      }

      const values = this.parseCsvLine(line);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) {
        continue;
      }

      const row: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = values[i] || '';
      }

      await onRow(row);
    }
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result.map((val) => val.replace(/^"|"$/g, '').trim());
  }

  /**
   * Importer: Load GTFS files sequentially to preserve FK integrity
   */
  async importGtfs(
    systemId: string,
    extractedDir: string,
  ): Promise<{ success: boolean; stats: any }> {
    const system = await this.prisma.system.findUnique({
      where: { id: systemId },
    });
    if (!system) {
      throw new Error(`Target System ID ${systemId} not found in database.`);
    }

    console.log(`Starting GTFS import for System: ${system.name}...`);

    const stats = {
      agencies: 0,
      lines: 0,
      stations: 0,
      platforms: 0,
      calendars: 0,
      calendarDates: 0,
      shapes: 0,
      trips: 0,
      stopTimes: 0,
      frequencies: 0,
    };

    // 1. IMPORT AGENCY
    const agenciesMap = new Map<string, string>(); // gtfs_agency_id -> db_agency_id
    const agencyFile = path.join(extractedDir, 'agency.txt');
    if (fs.existsSync(agencyFile)) {
      const rows: any[] = [];
      await this.parseCsvFile(agencyFile, async (row) => {
        const code = `AG_${row.agency_id || row.agency_name.toUpperCase().replace(/\s+/g, '_')}`;
        rows.push({
          code,
          name: row.agency_name,
          website: row.agency_url || '',
          contactEmail: row.agency_email || null,
          phone: row.agency_phone || null,
          logo: null,
          version: 1,
        });
        await Promise.resolve();
      });

      for (const arg of rows) {
        const created = await this.prisma.agency.upsert({
          where: { code: arg.code },
          update: arg,
          create: arg,
        });
        agenciesMap.set(arg.code.replace('AG_', ''), created.id);
        stats.agencies++;
      }
    }

    // 2. IMPORT STOPS (STATIONS & PLATFORMS)
    const stationsMap = new Map<string, string>(); // gtfs_stop_id (parent) -> db_station_id
    const stopsMap = new Map<string, string>(); // gtfs_stop_id (child) -> db_platform_id / db_station_id
    const stopsFile = path.join(extractedDir, 'stops.txt');

    if (fs.existsSync(stopsFile)) {
      // First pass: parent stations (location_type = 1)
      const parentStops: any[] = [];
      const childStops: any[] = [];

      await this.parseCsvFile(stopsFile, async (row) => {
        if (row.location_type === '1') {
          parentStops.push(row);
        } else {
          childStops.push(row);
        }
        await Promise.resolve();
      });

      // Insert parent stations
      for (const stop of parentStops) {
        const created = await this.prisma.station.upsert({
          where: { code: stop.stop_id },
          update: {
            name: stop.stop_name,
            latitude: parseFloat(stop.stop_lat),
            longitude: parseFloat(stop.stop_lon),
            timezone: stop.stop_timezone || system.timezone,
            city: system.city,
            state: '',
            country: system.country,
            wheelchairAccessible: stop.wheelchair_boarding === '1',
          },
          create: {
            systemId: system.id,
            code: stop.stop_id,
            name: stop.stop_name,
            latitude: parseFloat(stop.stop_lat),
            longitude: parseFloat(stop.stop_lon),
            timezone: stop.stop_timezone || system.timezone,
            city: system.city,
            state: '',
            country: system.country,
            wheelchairAccessible: stop.wheelchair_boarding === '1',
          },
        });
        stationsMap.set(stop.stop_id, created.id);
        stopsMap.set(stop.stop_id, created.id); // fallback for direct queries
        stats.stations++;
      }

      // Second pass: child stops / platforms
      for (const stop of childStops) {
        let parentDbId = stop.parent_station
          ? stationsMap.get(stop.parent_station)
          : null;

        // If no parent station was defined in GTFS, create a default station container
        if (!parentDbId) {
          const parentStation = await this.prisma.station.upsert({
            where: { code: `ST_${stop.stop_id}` },
            update: {
              name: stop.stop_name,
              latitude: parseFloat(stop.stop_lat),
              longitude: parseFloat(stop.stop_lon),
              timezone: system.timezone,
              city: system.city,
              state: '',
              country: system.country,
            },
            create: {
              systemId: system.id,
              code: `ST_${stop.stop_id}`,
              name: stop.stop_name,
              latitude: parseFloat(stop.stop_lat),
              longitude: parseFloat(stop.stop_lon),
              timezone: system.timezone,
              city: system.city,
              state: '',
              country: system.country,
            },
          });
          parentDbId = parentStation.id;
          stationsMap.set(`ST_${stop.stop_id}`, parentDbId);
          stats.stations++;
        }

        // Get or create Platform level in station container
        let platformLevel = await this.prisma.level.findFirst({
          where: { stationId: parentDbId, type: LevelType.PLATFORM },
        });

        if (!platformLevel) {
          platformLevel = await this.prisma.level.create({
            data: {
              stationId: parentDbId,
              name: 'Platform Level',
              levelNumber: 1,
              type: LevelType.PLATFORM,
            },
          });
        }

        stopsMap.set(stop.stop_id, parentDbId);
      }
    }

    // 3. IMPORT ROUTES (LINES)
    const linesMap = new Map<string, string>(); // gtfs_route_id -> db_line_id
    const routesFile = path.join(extractedDir, 'routes.txt');

    // Resolve standard AssetOwner for lines (fall back to MMRDA or system owner)
    let assetOwner = await this.prisma.assetOwner.findFirst();
    if (!assetOwner) {
      assetOwner = await this.prisma.assetOwner.create({
        data: { code: 'DEFAULT_OWNER', name: 'Default Asset Owner' },
      });
    }

    if (fs.existsSync(routesFile)) {
      await this.parseCsvFile(routesFile, async (row) => {
        const agencyCode = row.agency_id || 'default';
        const agencyDbId =
          agenciesMap.get(agencyCode) ||
          agenciesMap.values().next().value ||
          null;
        if (!agencyDbId) return;

        const code = row.route_id;
        const color = row.route_color ? `#${row.route_color}` : '#000000';

        const created = await this.prisma.line.upsert({
          where: { code },
          update: {
            name: row.route_long_name || row.route_short_name || code,
            color,
            status: LineStatus.ACTIVE,
          },
          create: {
            systemId: system.id,
            agencyId: agencyDbId,
            assetOwnerId: assetOwner.id,
            code,
            name: row.route_long_name || row.route_short_name || code,
            color,
            status: LineStatus.ACTIVE,
            traction: TractionType.OTHER,
            signalling: SignallingType.MANUAL,
          },
        });
        linesMap.set(code, created.id);
        stats.lines++;
        await Promise.resolve();
      });
    }

    // 4. IMPORT CALENDAR
    const calendarMap = new Map<string, string>(); // gtfs_service_id -> db_calendar_id
    const calendarFile = path.join(extractedDir, 'calendar.txt');
    if (fs.existsSync(calendarFile)) {
      await this.parseCsvFile(calendarFile, async (row) => {
        const serviceId = row.service_id;

        const parseDate = (dStr: string) => {
          const yr = parseInt(dStr.substring(0, 4));
          const mo = parseInt(dStr.substring(4, 6)) - 1;
          const dy = parseInt(dStr.substring(6, 8));
          return new Date(Date.UTC(yr, mo, dy));
        };

        const created = await this.prisma.calendar.upsert({
          where: { serviceId },
          update: {
            monday: row.monday === '1',
            tuesday: row.tuesday === '1',
            wednesday: row.wednesday === '1',
            thursday: row.thursday === '1',
            friday: row.friday === '1',
            saturday: row.saturday === '1',
            sunday: row.sunday === '1',
            startDate: parseDate(row.start_date),
            endDate: parseDate(row.end_date),
          },
          create: {
            systemId: system.id,
            serviceId,
            monday: row.monday === '1',
            tuesday: row.tuesday === '1',
            wednesday: row.wednesday === '1',
            thursday: row.thursday === '1',
            friday: row.friday === '1',
            saturday: row.saturday === '1',
            sunday: row.sunday === '1',
            startDate: parseDate(row.start_date),
            endDate: parseDate(row.end_date),
          },
        });
        calendarMap.set(serviceId, created.id);
        stats.calendars++;
        await Promise.resolve();
      });
    }

    // 5. IMPORT CALENDAR DATES (EXCEPTIONS)
    const calendarDatesFile = path.join(extractedDir, 'calendar_dates.txt');
    if (fs.existsSync(calendarDatesFile)) {
      const datesToInsert: any[] = [];
      await this.parseCsvFile(calendarDatesFile, async (row) => {
        const calendarDbId = calendarMap.get(row.service_id);
        if (!calendarDbId) return;

        const yr = parseInt(row.date.substring(0, 4));
        const mo = parseInt(row.date.substring(4, 6)) - 1;
        const dy = parseInt(row.date.substring(6, 8));
        const parsedDate = new Date(Date.UTC(yr, mo, dy));

        datesToInsert.push({
          calendarId: calendarDbId,
          date: parsedDate,
          exceptionType: parseInt(row.exception_type),
        });
        await Promise.resolve();
      });

      // Chunk insert exceptions
      const chunkSize = 1000;
      for (let i = 0; i < datesToInsert.length; i += chunkSize) {
        const chunk = datesToInsert.slice(i, i + chunkSize);
        await this.prisma.calendarDate.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        stats.calendarDates += chunk.length;
      }
    }

    // 6. IMPORT SHAPES
    const shapesFile = path.join(extractedDir, 'shapes.txt');
    if (fs.existsSync(shapesFile)) {
      const shapesToInsert: any[] = [];
      await this.parseCsvFile(shapesFile, async (row) => {
        shapesToInsert.push({
          systemId: system.id,
          shapeId: row.shape_id,
          latitude: parseFloat(row.shape_pt_lat),
          longitude: parseFloat(row.shape_pt_lon),
          sequence: parseInt(row.shape_pt_sequence),
          distTraveled: row.shape_dist_traveled
            ? parseFloat(row.shape_dist_traveled)
            : null,
        });
        await Promise.resolve();
      });

      const chunkSize = 1000;
      for (let i = 0; i < shapesToInsert.length; i += chunkSize) {
        const chunk = shapesToInsert.slice(i, i + chunkSize);
        await this.prisma.shape.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        stats.shapes += chunk.length;
      }
    }

    // 7. IMPORT TRIPS
    const tripsMap = new Map<string, string>(); // gtfs_trip_id -> db_trip_id
    const tripsFile = path.join(extractedDir, 'trips.txt');
    if (fs.existsSync(tripsFile)) {
      const tripsToInsert: any[] = [];
      await this.parseCsvFile(tripsFile, async (row) => {
        const lineDbId = linesMap.get(row.route_id);
        if (!lineDbId) return;

        tripsToInsert.push({
          lineId: lineDbId,
          serviceId: row.service_id,
          tripId: row.trip_id,
          tripHeadsign: row.trip_headsign || null,
          directionId: row.direction_id ? parseInt(row.direction_id) : null,
          shapeId: row.shape_id || null,
        });
        await Promise.resolve();
      });

      const chunkSize = 1000;
      for (let i = 0; i < tripsToInsert.length; i += chunkSize) {
        const chunk = tripsToInsert.slice(i, i + chunkSize);
        await this.prisma.trip.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        stats.trips += chunk.length;
      }

      // Cache trip db IDs for stop_times import
      const dbTrips = await this.prisma.trip.findMany({
        select: { id: true, tripId: true },
      });
      for (const t of dbTrips) {
        tripsMap.set(t.tripId, t.id);
      }
    }

    // 8. IMPORT STOP TIMES
    const stopTimesFile = path.join(extractedDir, 'stop_times.txt');
    if (fs.existsSync(stopTimesFile)) {
      const stopTimesToInsert: any[] = [];
      await this.parseCsvFile(stopTimesFile, async (row) => {
        const tripDbId = tripsMap.get(row.trip_id);
        const stationDbId = stopsMap.get(row.stop_id);
        if (!tripDbId || !stationDbId) return;

        stopTimesToInsert.push({
          tripId: tripDbId,
          stationId: stationDbId,
          arrivalTime: row.arrival_time,
          departureTime: row.departure_time,
          stopSequence: parseInt(row.stop_sequence),
          stopHeadsign: row.stop_headsign || null,
          pickupType: row.pickup_type ? parseInt(row.pickup_type) : 0,
          dropOffType: row.drop_off_type ? parseInt(row.drop_off_type) : 0,
        });
        await Promise.resolve();
      });

      const chunkSize = 1000;
      for (let i = 0; i < stopTimesToInsert.length; i += chunkSize) {
        const chunk = stopTimesToInsert.slice(i, i + chunkSize);
        await this.prisma.stopTime.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        stats.stopTimes += chunk.length;
      }
    }

    // 9. IMPORT FREQUENCIES
    const frequenciesFile = path.join(extractedDir, 'frequencies.txt');
    if (fs.existsSync(frequenciesFile)) {
      const freqToInsert: any[] = [];
      await this.parseCsvFile(frequenciesFile, async (row) => {
        const tripDbId = tripsMap.get(row.trip_id);
        if (!tripDbId) return;

        freqToInsert.push({
          tripId: tripDbId,
          startTime: row.start_time,
          endTime: row.end_time,
          headwaySecs: parseInt(row.headway_secs),
          exactTimes: row.exact_times ? parseInt(row.exact_times) : 0,
        });
        await Promise.resolve();
      });

      await this.prisma.frequency.createMany({
        data: freqToInsert,
        skipDuplicates: true,
      });
      stats.frequencies += freqToInsert.length;
    }

    console.log(`GTFS Ingestion completed successfully! Stats:`, stats);
    return { success: true, stats };
  }
}
