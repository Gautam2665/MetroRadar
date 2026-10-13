import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { GtfsRtSyncService } from './gtfs-rt-sync.service';

export interface IncomingTrain {
  vehicleId: string;
  tripId: string;
  label: string;
  status: string;
  latitude: number;
  longitude: number;
  delaySeconds: number;
  etaMinutes: number;
  coaches: any[];
}

export interface PlatformLiveBoarding {
  platformId: string;
  platformNumber: string;
  lineId: string;
  lineCode: string;
  lineName: string;
  lineColor: string;
  towardsStationName: string;
  trains: IncomingTrain[];
}

export interface StationLiveBoardingResponse {
  stationId: string;
  stationName: string;
  timestamp: number;
  platforms: PlatformLiveBoarding[];
}

interface StopTimeUpcomingItem {
  depSecs: number;
  arrSecs: number;
  predDepSecs: number;
  predArrSecs: number;
  diffSecs: number;
  delaySeconds: number;
  etaMinutes: number;
  isBoarding: boolean;
  isTerminalArrival?: boolean;
  headsign: string;
  tripId: string;
  directionId: number;
  lineCode: string;
  lineName: string;
  stopSequence: number;
}

@Injectable()
export class RealtimeNetworkService {
  private readonly logger = new Logger(RealtimeNetworkService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly gtfsRtSync: GtfsRtSyncService,
  ) {}

  /**
   * Generates live boarding ETAs & train positions for all platforms of a station.
   */
  public async getLiveStationBoarding(
    stationId: string,
  ): Promise<StationLiveBoardingResponse> {
    // 1. Fetch station details from DB
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stationId);
    let targetStation = await this.prisma.station.findFirst({
      where: isUuid
        ? { id: stationId, isActive: true }
        : { code: stationId, isActive: true },
    });

    if (!targetStation) {
      const platformRecord = await this.prisma.platform.findFirst({
        where: isUuid
          ? { id: stationId, isActive: true }
          : { sourceId: stationId, isActive: true },
        include: { level: { include: { station: true } } },
      });
      if (platformRecord?.level?.station) {
        targetStation = platformRecord.level.station;
      }
    }

    if (!targetStation && stationId.startsWith('PF_')) {
      const derivedCode = stationId.replace(/^PF_/, '').replace(/_\d+$/, '');
      const derivedStation = await this.prisma.station.findFirst({
        where: { code: derivedCode, isActive: true },
      });
      if (derivedStation) {
        targetStation = derivedStation;
      }
    }

    if (!targetStation) {
      return {
        stationId,
        stationName: 'Station Not Found',
        timestamp: Date.now(),
        platforms: [],
      };
    }

    // 2. Fetch all stations sharing the same landmark name and city (e.g. Dahisar (East) on Line 2A and Line 7)
    const matchingStations = await this.prisma.station.findMany({
      where: {
        city: targetStation.city,
        name: { equals: targetStation.name, mode: 'insensitive' },
        isActive: true,
      },
      select: { id: true },
    });

    const stationIds = matchingStations.map((s) => s.id);
    if (!stationIds.includes(targetStation.id)) {
      stationIds.push(targetStation.id);
    }

    // 3. Query DB for platforms under these station levels
    const platforms = await this.prisma.platform.findMany({
      where: {
        level: {
          stationId: { in: stationIds },
          isActive: true,
        },
        isActive: true,
      },
      include: {
        line: { select: { id: true, code: true, name: true, color: true } },
        level: { select: { stationId: true, name: true } },
        towardsStation: { select: { id: true, name: true, code: true } },
      },
      orderBy: { platformNumber: 'asc' },
    });

    // 4. Determine current operating day & filter by active service calendar
    const now = new Date();
    const dayField = this.getDayField(now);
    const nowSecs = this.getNowSecondsOfDay();

    const activeCalendars = await this.prisma.calendar.findMany({
      where: {
        [dayField]: true,
        isActive: true,
      },
      select: { serviceId: true },
    });
    const activeServiceIds = activeCalendars.map((c) => c.serviceId);

    // 5. Query PostgreSQL GTFS static stop_times for today's operating schedule
    // Look back 5 minutes to capture trains currently dwelling at the platform or delayed
    const queryStartSecs = Math.max(0, nowSecs - 300);
    const queryStartTimeStr = this.formatSecondsToHHMMSS(queryStartSecs);

    let stopTimes = await this.prisma.stopTime.findMany({
      where: {
        stationId: { in: stationIds },
        isActive: true,
        departureTime: { gte: queryStartTimeStr },
        ...(activeServiceIds.length > 0
          ? { trip: { serviceId: { in: activeServiceIds }, isActive: true } }
          : { trip: { isActive: true } }),
      },
      include: {
        trip: {
          select: {
            tripId: true,
            directionId: true,
            tripHeadsign: true,
            serviceId: true,
            line: { select: { id: true, code: true, name: true, color: true } },
            stopTimes: {
              orderBy: { stopSequence: 'desc' },
              take: 1,
              select: { stopSequence: true },
            },
          },
        },
      },
      orderBy: { departureTime: 'asc' },
    });

    // If no departures remaining today (e.g. late night), fallback to next morning's earliest
    if (stopTimes.length === 0) {
      stopTimes = await this.prisma.stopTime.findMany({
        where: {
          stationId: { in: stationIds },
          isActive: true,
          ...(activeServiceIds.length > 0
            ? { trip: { serviceId: { in: activeServiceIds }, isActive: true } }
            : { trip: { isActive: true } }),
        },
        include: {
          trip: {
            select: {
              tripId: true,
              directionId: true,
              tripHeadsign: true,
              serviceId: true,
              line: { select: { id: true, code: true, name: true, color: true } },
              stopTimes: {
                orderBy: { stopSequence: 'desc' },
                take: 1,
                select: { stopSequence: true },
              },
            },
          },
        },
        orderBy: { departureTime: 'asc' },
        take: 10,
      });
    }

    // 6. Scan GTFS-RT in-memory vehicle & delay cache
    const activeVehicles = this.gtfsRtSync.getAllActiveVehicles();

    // 7. Group upcoming stopTimes strictly by line ID and directionId (0 = Southbound/Outbound, 1 = Northbound/Inbound)
    const directionStopTimesMap = new Map<string, StopTimeUpcomingItem[]>();

    // Map of terminating arrival trips per line (e.g. Southbound arriving at Gundavali)
    const terminalArrivalsMap = new Map<string, StopTimeUpcomingItem[]>();

    for (const st of stopTimes) {
      const arrSecs = this.parseTimeToSeconds(st.arrivalTime);
      const depSecs = this.parseTimeToSeconds(st.departureTime);
      const delayState = this.gtfsRtSync.getDelayForTrip(st.trip.tripId);
      const delaySeconds = delayState?.delaySeconds ?? 0;

      const predArrSecs = arrSecs + delaySeconds;
      const predDepSecs = depSecs + delaySeconds;

      // Strict departure cutoff: if train has already departed, discard immediately!
      let diffDepSecs = predDepSecs - nowSecs;
      if (diffDepSecs <= 0) {
        if (nowSecs > 80000 && predDepSecs < 7200) {
          diffDepSecs += 86400; // Genuine midnight wrap
        } else {
          // Departed from platform -> discard
          continue;
        }
      }

      // Check dwell status
      const isBoarding = nowSecs >= predArrSecs && nowSecs < predDepSecs;
      let etaMinutes = 0;
      if (!isBoarding) {
        let diffArrSecs = predArrSecs - nowSecs;
        if (diffArrSecs < 0 && nowSecs > 80000 && predArrSecs < 7200) diffArrSecs += 86400;
        etaMinutes = Math.max(1, Math.round(diffArrSecs / 60));
      }

      const lineKey = st.trip.line.id;
      const dir = st.trip.directionId ?? 0;
      const maxTripSeq = (st.trip as any).stopTimes?.[0]?.stopSequence ?? 999;
      const isTerminalArrival = st.stopSequence >= maxTripSeq;

      const item: StopTimeUpcomingItem = {
        depSecs,
        arrSecs,
        predDepSecs,
        predArrSecs,
        diffSecs: diffDepSecs,
        delaySeconds,
        etaMinutes,
        isBoarding,
        headsign: st.stopHeadsign || st.trip.tripHeadsign || 'Terminal',
        tripId: st.trip.tripId,
        directionId: dir,
        lineCode: st.trip.line.code,
        lineName: st.trip.line.name,
        isTerminalArrival,
        stopSequence: st.stopSequence,
      };

      if (isTerminalArrival) {
        // Track terminating arrivals separately so departing countdowns never show "Gundavali -> Gundavali"
        const arrKey = `${lineKey}_${dir}`;
        if (!terminalArrivalsMap.has(arrKey)) {
          terminalArrivalsMap.set(arrKey, []);
        }
        terminalArrivalsMap.get(arrKey)!.push(item);
      } else {
        // Valid passenger boarding departure
        const groupKey = `${lineKey}_${dir}`;
        if (!directionStopTimesMap.has(groupKey)) {
          directionStopTimesMap.set(groupKey, []);
        }
        directionStopTimesMap.get(groupKey)!.push(item);
      }
    }

    // Sort stopTimes by departure time
    for (const [, items] of directionStopTimesMap.entries()) {
      items.sort((a, b) => a.diffSecs - b.diffSecs);
    }

    // 8. If DB platform records don't exist yet for this station, synthesize platform views per serving line
    if (platforms.length === 0) {
      const linesServing = await this.prisma.line.findMany({
        where: {
          isActive: true,
          trips: {
            some: {
              stopTimes: {
                some: { stationId: { in: stationIds }, isActive: true },
              },
            },
          },
        },
        select: { id: true, code: true, name: true, color: true },
      });

      const syntheticPlatforms: PlatformLiveBoarding[] = [];

      linesServing.forEach((line) => {
        // Create 2 platform representations per line (Platform 1 for Dir 0, Platform 2 for Dir 1)
        [0, 1].forEach((dir) => {
          const groupKey = `${line.id}_${dir}`;
          const upcoming = directionStopTimesMap.get(groupKey) || [];

          // Filter out entries with diffSecs > 7200 (2h) — these are likely midnight-wrap artefacts
          const validUpcoming = upcoming.filter((item) => item.diffSecs <= 7200);

          const incomingTrains: IncomingTrain[] = validUpcoming.slice(0, 2).map((item, vIdx) => {
            const liveVehicle = activeVehicles.find((v) => v.tripId === item.tripId);
            const vehicleId = liveVehicle?.vehicleId || `VEH_${item.lineCode}_${dir + 1}_${vIdx + 1}`;
            const label = liveVehicle?.vehicleId ? `Train ${liveVehicle.vehicleId}` : `Train ${item.lineCode}-${dir + 1}`;
            const status = item.isBoarding ? 'STOPPED_AT' : (liveVehicle?.currentStatus || 'SCHEDULED');
            const latitude = liveVehicle?.latitude || 0;
            const longitude = liveVehicle?.longitude || 0;
            const coaches = liveVehicle?.multiCarriageDetails || [];

            return {
              vehicleId,
              tripId: item.tripId,
              label,
              status,
              latitude,
              longitude,
              delaySeconds: item.delaySeconds,
              etaMinutes: item.etaMinutes,
              coaches,
            };
          });

          if (incomingTrains.length === 0) {
            const baseEta = dir === 0 ? 3 : 5;
            incomingTrains.push({
              vehicleId: `TRAIN_${line.code}_0${dir + 1}`,
              tripId: `TRIP_${line.code}_0${dir + 1}`,
              label: `Scheduled Train`,
              status: 'SCHEDULED',
              latitude: 0,
              longitude: 0,
              delaySeconds: 0,
              etaMinutes: baseEta,
              coaches: [],
            });
          }

          const topUpcoming = upcoming[0];
          const towardsStationName = topUpcoming?.headsign || `Terminal (${line.name})`;

          syntheticPlatforms.push({
            platformId: `synth-pf-${line.id}-${dir + 1}`,
            platformNumber: `Platform ${dir + 1}`,
            lineId: line.id,
            lineCode: line.code,
            lineName: line.name,
            lineColor: line.color || '#00e5ff',
            towardsStationName,
            trains: incomingTrains,
          });
        });
      });

      return {
        stationId: targetStation.id,
        stationName: targetStation.name,
        timestamp: Date.now(),
        platforms: syntheticPlatforms,
      };
    }

    // 9. Format actual DB platforms mapping platform_code / platformNumber to exact direction:
    // Platform 1 -> direction_id 0 (e.g. Gundavali Southbound, Andheri West, Ghatkopar)
    // Platform 2 -> direction_id 1 (e.g. Kashigaon Northbound, Dahisar East, Versova)
    const livePlatforms: PlatformLiveBoarding[] = platforms.map((platform, pfIdx) => {
      const line = platform.line;
      const lineKey = line.id;
      const pNum = parseInt(platform.platformNumber, 10);
      let targetDir = isNaN(pNum) ? (pfIdx % 2) : (pNum - 1) % 2;

      // If platform has explicit towardsStation, match with direction 0 or 1 headsigns
      if (platform.towardsStation?.name) {
        const tName = platform.towardsStation.name.toLowerCase();
        const dir0Items = directionStopTimesMap.get(`${lineKey}_0`) || [];
        const dir1Items = directionStopTimesMap.get(`${lineKey}_1`) || [];
        if (dir0Items.some((i) => i.headsign.toLowerCase().includes(tName))) {
          targetDir = 0;
        } else if (dir1Items.some((i) => i.headsign.toLowerCase().includes(tName))) {
          targetDir = 1;
        }
      }

      const groupKey = `${lineKey}_${targetDir}`;
      let targetUpcoming = directionStopTimesMap.get(groupKey) || [];

      // Check if this platform represents the terminating arrival side of a terminus
      const terminatingArrivals = terminalArrivalsMap.get(groupKey) || [];
      const isTerminusArrivalPlatform = targetUpcoming.length === 0 && terminatingArrivals.length > 0;

      if (isTerminusArrivalPlatform) {
        targetUpcoming = terminatingArrivals;
      }

      // Filter out departures further than 2 hours ahead
      targetUpcoming = targetUpcoming.filter((item) => item.diffSecs <= 7200);

      const incomingTrains: IncomingTrain[] = targetUpcoming.slice(0, 2).map((item, vIdx) => {
        const liveVehicle = activeVehicles.find((v) => v.tripId === item.tripId);
        const vehicleId = liveVehicle?.vehicleId || `VEH_${item.lineCode}_${targetDir + 1}_${vIdx + 1}`;
        const label = liveVehicle?.vehicleId
          ? `Train ${liveVehicle.vehicleId}`
          : `Train ${item.lineCode}-${targetDir + 1}`;
        const status = item.isBoarding
          ? 'STOPPED_AT'
          : (liveVehicle?.currentStatus || 'SCHEDULED');
        const latitude = liveVehicle?.latitude || 0;
        const longitude = liveVehicle?.longitude || 0;
        const coaches = liveVehicle?.multiCarriageDetails || [];

        return {
          vehicleId,
          tripId: item.tripId,
          label,
          status,
          latitude,
          longitude,
          delaySeconds: item.delaySeconds,
          etaMinutes: item.etaMinutes,
          coaches,
        };
      });

      if (incomingTrains.length === 0) {
        const baseEta = targetDir === 0 ? 3 : 5;
        incomingTrains.push({
          vehicleId: `TRAIN_${line.code}_${platform.platformNumber}`,
          tripId: `TRIP_${line.code}_${platform.platformNumber}`,
          label: `Scheduled Train`,
          status: 'SCHEDULED',
          latitude: 0,
          longitude: 0,
          delaySeconds: 0,
          etaMinutes: baseEta,
          coaches: [],
        });
      }

      const topUpcoming = targetUpcoming[0];
      const towardsStationName = isTerminusArrivalPlatform
        ? 'Terminating / Drop-off Only'
        : topUpcoming?.headsign ||
          platform.towardsStation?.name ||
          `Terminal (${line.name})`;

      return {
        platformId: platform.id,
        platformNumber: `Platform ${platform.platformNumber}`,
        lineId: line.id,
        lineCode: line.code,
        lineName: line.name,
        lineColor: line.color || '#00e5ff',
        towardsStationName,
        trains: incomingTrains,
      };
    });

    return {
      stationId: targetStation.id,
      stationName: targetStation.name,
      timestamp: Date.now(),
      platforms: livePlatforms,
    };
  }

  private getDayField(date: Date): 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' {
    const days: Array<'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[date.getDay()];
  }

  private parseTimeToSeconds(tStr: string): number {
    if (!tStr) return 0;
    const parts = tStr.split(':').map(Number);
    let hrs = parts[0] || 0;
    let mins = parts[1] || 0;
    let secs = parts[2] || 0;
    if (hrs >= 24) hrs = hrs % 24;
    return hrs * 3600 + mins * 60 + secs;
  }

  private formatSecondsToHHMMSS(seconds: number): string {
    const hrs = Math.floor(seconds / 3600) % 24;
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  private getNowSecondsOfDay(): number {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }
}
