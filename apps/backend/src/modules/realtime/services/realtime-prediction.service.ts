import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { GtfsRtSyncService } from './gtfs-rt-sync.service';

export interface UpcomingTrainPrediction {
  tripId: string;
  routeId: string;
  headsign?: string;
  scheduledDeparture: string;
  delaySeconds: number;
  etaMinutes: number;
  status: string;
  label: string;
}

export interface JourneyRealtimeInfo {
  primaryTrain: UpcomingTrainPrediction;
  followingTrain: UpcomingTrainPrediction | null;
}

export interface RealtimePredictableLeg {
  type: string;
  from: string;
  to?: string;
  lineId?: string | null;
  towards?: string | null;
  duration?: number;
  durationSeconds?: number;
  throughServiceContinuationFromPrevious?: boolean;
  realtimeEtaMins?: number;
  connectionWaitMins?: number;
  realtimeTimeStr?: string;
  delaySeconds?: number;
}

@Injectable()
export class RealtimePredictionService {
  private readonly logger = new Logger(RealtimePredictionService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly gtfsRtSync: GtfsRtSyncService,
  ) {}

  /**
   * Calculates live ETA for a specific scheduled trip at an origin station.
   */
  public calculateTripEta(
    tripId: string,
    scheduledDepartureSecs: number,
    nowSecs: number = this.getNowSecondsOfDay(),
  ): { etaMinutes: number; delaySeconds: number } {
    const realtimeState = this.gtfsRtSync.getDelayForTrip(tripId);
    const delaySeconds = realtimeState?.delaySeconds ?? 0;

    const expectedDepartureSecs = scheduledDepartureSecs + delaySeconds;
    const remainingSecs = expectedDepartureSecs - nowSecs;

    const etaMinutes = Math.max(1, Math.round(remainingSecs / 60));

    return { etaMinutes, delaySeconds };
  }

  /**
   * Evaluates live real-time departure and ETA for each transit BOARD leg in a candidate journey.
   * Cumulative progress formula:
   * Expected Arrival at Interchange = Trip Departure + In-Vehicle Time + Transfer Walk Time
   */
  public async predictLegsRealtime(legs: RealtimePredictableLeg[]): Promise<void> {
    const nowSecs = this.getNowSecondsOfDay();
    let cumulativeSecs = nowSecs;

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];

      if (leg.type === 'TRANSIT' && !leg.throughServiceContinuationFromPrevious) {
        // 1. Calculate cumulative arrival time at the platform (in seconds from midnight)
        const arrivalAtPlatformSecs = cumulativeSecs; // Includes travel + walk time

        // 2. Query next active departure at/after arrivalAtPlatformSecs
        const prediction = await this.predictTransitDeparture(
          leg.from,
          leg.lineId,
          leg.towards,
          arrivalAtPlatformSecs,
          nowSecs,
        );

        // 3. Compute wait time AT THE INTERCHANGE PLATFORM
        const actualDepartureSecs = prediction.actualDepartureSecs;
        const connectionWaitMins = Math.max(0, Math.round((actualDepartureSecs - arrivalAtPlatformSecs) / 60));

        // 4. Compute overall elapsed time from CURRENT CLOCK NOW
        const totalEtaFromNowMins = Math.max(0, Math.round((actualDepartureSecs - nowSecs) / 60));

        leg.connectionWaitMins = connectionWaitMins; // e.g. 4 mins wait at WEH
        leg.realtimeEtaMins = totalEtaFromNowMins;    // e.g. 35 mins from journey start
        leg.realtimeTimeStr = prediction.realtimeTimeStr; // "12:57 PM"
        leg.delaySeconds = prediction.delaySeconds;

        // Cumulative progress: actual departure + in-vehicle duration
        const inVehicleDuration = leg.durationSeconds || leg.duration || 180;
        cumulativeSecs = prediction.actualDepartureSecs + inVehicleDuration;
      } else if (leg.type === 'TRANSIT' && leg.throughServiceContinuationFromPrevious) {
        // Continuous service on the same train: passenger remains onboard
        cumulativeSecs += (leg.durationSeconds || leg.duration || 180);
      } else {
        // WALK / TRANSFER leg: transfer walking time
        cumulativeSecs += (leg.durationSeconds || leg.duration || 120);
      }
    }
  }

  /**
   * Evaluates live prediction for the primary trip and following trip on the first leg of a journey.
   */
  public async predictJourneyTrains(
    originStationId: string,
    lineId: string,
  ): Promise<JourneyRealtimeInfo> {
    const nowSecs = this.getNowSecondsOfDay();
    const primary = await this.predictTransitDeparture(
      originStationId,
      lineId,
      null,
      nowSecs,
      nowSecs,
    );

    const followingActualSecs = primary.actualDepartureSecs + 480; // ~8 mins headway
    let followingDiff = followingActualSecs - nowSecs;
    if (followingDiff < -30) followingDiff += 86400;
    const followingMins = Math.max(primary.realtimeEtaMins + 4, Math.round(followingDiff / 60));

    const statusStr =
      primary.delaySeconds > 0
        ? `DELAYED_${Math.round(primary.delaySeconds / 60)}M`
        : 'ON_TIME';

    return {
      primaryTrain: {
        tripId: `TRIP_${lineId}_01`,
        routeId: lineId,
        scheduledDeparture: primary.realtimeTimeStr,
        delaySeconds: primary.delaySeconds,
        etaMinutes: primary.realtimeEtaMins,
        status: statusStr,
        label: `Leaves in ${primary.realtimeEtaMins} mins`,
      },
      followingTrain: {
        tripId: `TRIP_${lineId}_02`,
        routeId: lineId,
        scheduledDeparture: this.formatSecondsToTimeString(followingActualSecs),
        delaySeconds: 0,
        etaMinutes: followingMins,
        status: 'ON_TIME',
        label: `Next in ${followingMins} mins`,
      },
    };
  }

  /**
   * Predicts next transit departure at stationId for lineId after earliestDepartureSecs.
   */
  public async predictTransitDeparture(
    stationId: string,
    lineId: string | null | undefined,
    towardsHeadsign: string | null | undefined,
    earliestDepartureSecs: number,
    nowSecs: number,
  ): Promise<{
    realtimeEtaMins: number;
    realtimeTimeStr: string;
    delaySeconds: number;
    actualDepartureSecs: number;
  }> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stationId);
      const targetStation = await this.prisma.station.findFirst({
        where: isUuid
          ? { id: stationId, isActive: true }
          : { code: stationId, isActive: true },
      });

      if (!targetStation) {
        return this.createFallbackDeparture(earliestDepartureSecs, nowSecs);
      }

      // Group matching stations in the same city (e.g. interchange complexes)
      const matchingStations = await this.prisma.station.findMany({
        where: {
          city: targetStation.city,
          name: { equals: targetStation.name, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      const stationIds = matchingStations.map((s) => s.id);
      if (!stationIds.includes(targetStation.id)) stationIds.push(targetStation.id);

      // Resolve line UUID if lineId is code or name
      let resolvedLineId = lineId;
      if (lineId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lineId)) {
        const lineRecord = await this.prisma.line.findFirst({
          where: {
            OR: [
              { code: lineId, isActive: true },
              { name: { contains: lineId, mode: 'insensitive' }, isActive: true },
            ],
          },
          select: { id: true },
        });
        if (lineRecord) resolvedLineId = lineRecord.id;
      }

      // Active calendar for today
      const now = new Date();
      const dayField = this.getDayField(now);
      const activeCalendars = await this.prisma.calendar.findMany({
        where: {
          [dayField]: true,
          isActive: true,
        },
        select: { serviceId: true },
      });
      const activeServiceIds = activeCalendars.map((c) => c.serviceId);

      // Query static timetable stop times
      const stopTimes = await this.prisma.stopTime.findMany({
        where: {
          stationId: { in: stationIds },
          isActive: true,
          ...(resolvedLineId ? { trip: { lineId: resolvedLineId, isActive: true } } : {}),
          ...(activeServiceIds.length > 0
            ? { trip: { serviceId: { in: activeServiceIds }, ...(resolvedLineId ? { lineId: resolvedLineId } : {}), isActive: true } }
            : {}),
        },
        include: {
          trip: {
            select: {
              tripId: true,
              directionId: true,
              tripHeadsign: true,
              serviceId: true,
              line: { select: { id: true, code: true, name: true, color: true } },
            },
          },
        },
        orderBy: { departureTime: 'asc' },
      });

      if (stopTimes.length === 0) {
        return this.createFallbackDeparture(earliestDepartureSecs, nowSecs);
      }

      // Filter by towards/headsign if available
      let filteredTimes = stopTimes;
      if (towardsHeadsign) {
        const targetHeadsign = towardsHeadsign.toUpperCase().trim();
        const matched = stopTimes.filter((st) => {
          const h = (st.stopHeadsign || st.trip.tripHeadsign || '').toUpperCase();
          return h.includes(targetHeadsign) || targetHeadsign.includes(h);
        });
        if (matched.length > 0) {
          filteredTimes = matched;
        }
      }

      // 1. Search for today's upcoming departures where actualDepartureSecs >= earliestDepartureSecs
      for (const st of filteredTimes) {
        const scheduledDepSecs = this.parseTimeToSeconds(st.departureTime);
        const delayState = this.gtfsRtSync.getDelayForTrip(st.trip.tripId);
        const delaySeconds = delayState?.delaySeconds ?? 0;
        const actualDepartureSecs = scheduledDepSecs + delaySeconds;

        if (actualDepartureSecs >= earliestDepartureSecs) {
          const minsFromNow = Math.max(1, Math.round((actualDepartureSecs - nowSecs) / 60));
          const realtimeTimeStr = this.formatSecondsToTimeString(actualDepartureSecs);

          return {
            realtimeEtaMins: minsFromNow,
            realtimeTimeStr,
            delaySeconds,
            actualDepartureSecs,
          };
        }
      }

      // 2. If no departure remaining today (e.g. late night), take next morning's first train
      const firstSt = filteredTimes[0];
      const scheduledDepSecs = this.parseTimeToSeconds(firstSt.departureTime) + 86400;
      const delayState = this.gtfsRtSync.getDelayForTrip(firstSt.trip.tripId);
      const delaySeconds = delayState?.delaySeconds ?? 0;
      const actualDepartureSecs = scheduledDepSecs + delaySeconds;
      const minsFromNow = Math.max(1, Math.round((actualDepartureSecs - nowSecs) / 60));
      const realtimeTimeStr = this.formatSecondsToTimeString(actualDepartureSecs);

      return {
        realtimeEtaMins: minsFromNow,
        realtimeTimeStr,
        delaySeconds,
        actualDepartureSecs,
      };
    } catch (err) {
      this.logger.warn(`Failed to predict transit departure for station ${stationId}: ${err}`);
      return this.createFallbackDeparture(earliestDepartureSecs, nowSecs);
    }
  }

  private createFallbackDeparture(earliestDepartureSecs: number, nowSecs: number) {
    const headwaySecs = 240; // 4 mins default headway
    const actualDepartureSecs = earliestDepartureSecs + headwaySecs;
    let minsFromNow = Math.round((actualDepartureSecs - nowSecs) / 60);
    if (minsFromNow < -30) minsFromNow += 1440;
    const realtimeEtaMins = Math.max(1, minsFromNow);
    const realtimeTimeStr = this.formatSecondsToTimeString(actualDepartureSecs);
    return {
      realtimeEtaMins,
      realtimeTimeStr,
      delaySeconds: 0,
      actualDepartureSecs,
    };
  }

  private formatSecondsToTimeString(seconds: number): string {
    const normSecs = ((seconds % 86400) + 86400) % 86400;
    const hours = Math.floor(normSecs / 3600);
    const minutes = Math.floor((normSecs % 3600) / 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
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

  private getNowSecondsOfDay(): number {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }
}
