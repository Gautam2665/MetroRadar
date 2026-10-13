import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import * as GtfsRealtimeBindings from 'gtfs-realtime-bindings';

export interface TripStopTimeUpdate {
  stopId: string | null;
  stopSequence: number | null;
  arrivalTimeEpoch: number | null;
  departureTimeEpoch: number | null;
  arrivalDelay: number | null;
  departureDelay: number | null;
}

export interface TripDelayState {
  tripId: string;
  routeId: string;
  stopId: string;
  stopSequence: number;
  delaySeconds: number;
  updatedAt: number;
  stopTimeUpdates?: TripStopTimeUpdate[];
}

export interface VehiclePositionState {
  vehicleId: string;
  tripId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  bearing: number | null;
  speed: number | null;
  timestamp: number | null;
  currentStopSequence: number | null;
  currentStatus: string;
  headsign?: string | null;
  multiCarriageDetails?: any[];
}

function toNumberOrNull(val: unknown): number | null {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (val && typeof (val as { toNumber?: () => number }).toNumber === 'function') {
    return (val as { toNumber: () => number }).toNumber();
  }
  return null;
}

@Injectable()
export class GtfsRtSyncService implements OnModuleInit {
  private readonly logger = new Logger(GtfsRtSyncService.name);

  // In-Memory Real-Time State Store
  private activeDelays = new Map<string, TripDelayState>();
  private activeVehicles = new Map<string, VehiclePositionState>();

  private readonly UPDATES_URL = process.env.GTFS_RT_UPDATES_URL || 'http://localhost:8080/gtfsrt/updates';
  private readonly VEHICLES_URL = process.env.GTFS_RT_VEHICLES_URL || 'http://localhost:8080/gtfsrt/vehicles';

  private pollIntervalTimer: ReturnType<typeof setInterval> | null = null;

  onModuleInit() {
    this.pollRealtimeFeeds();
    this.pollIntervalTimer = setInterval(() => {
      this.pollRealtimeFeeds().catch((err) =>
        this.logger.error(`Failed to refresh GTFS-RT: ${err.message}`),
      );
    }, 5000);
  }

  onModuleDestroy() {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
  }

  // Poll every 10 seconds to sync dynamic delay updates
  @Cron(CronExpression.EVERY_10_SECONDS)
  public async pollRealtimeFeeds(): Promise<void> {
    await Promise.all([this.syncTripUpdates(), this.syncVehiclePositions()]);
  }

  private async syncTripUpdates(): Promise<void> {
    try {
      const response = await axios.get(this.UPDATES_URL, { responseType: 'arraybuffer' });
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(response.data));
      const newDelays = new Map<string, TripDelayState>();

      feed.entity.forEach((entity: any) => {
        const tu = entity.tripUpdate || entity.trip_update;
        if (tu && tu.trip) {
          const tripId = tu.trip.tripId || tu.trip.trip_id || '';
          const routeId = tu.trip.routeId || tu.trip.route_id || '';

          if (!tripId) return;

          const stus = tu.stopTimeUpdate || tu.stop_time_update || [];
          const parsedStopUpdates: TripStopTimeUpdate[] = [];
          let latestStopId = '';
          let latestStopSeq = 1;
          let latestDelaySeconds = 0;

          stus.forEach((stu: any) => {
            const stopId = stu.stopId || stu.stop_id || null;
            const stopSeq =
              typeof (stu.stopSequence ?? stu.stop_sequence) === 'number'
                ? (stu.stopSequence ?? stu.stop_sequence)
                : null;
            const arrival = stu.arrival;
            const departure = stu.departure;

            const arrivalTimeEpoch = toNumberOrNull(arrival?.time);
            const departureTimeEpoch = toNumberOrNull(departure?.time);
            const arrivalDelay = typeof arrival?.delay === 'number' ? arrival.delay : null;
            const departureDelay = typeof departure?.delay === 'number' ? departure.delay : null;

            parsedStopUpdates.push({
              stopId,
              stopSequence: stopSeq,
              arrivalTimeEpoch,
              departureTimeEpoch,
              arrivalDelay,
              departureDelay,
            });

            if (stopId) latestStopId = stopId;
            if (stopSeq !== null) latestStopSeq = stopSeq;
            if (arrivalDelay !== null) {
              latestDelaySeconds = arrivalDelay;
            } else if (departureDelay !== null) {
              latestDelaySeconds = departureDelay;
            }
          });

          if (parsedStopUpdates.length > 0) {
            newDelays.set(tripId, {
              tripId,
              routeId,
              stopId: latestStopId,
              stopSequence: latestStopSeq,
              delaySeconds: latestDelaySeconds,
              updatedAt: Date.now(),
              stopTimeUpdates: parsedStopUpdates,
            });
          }
        }
      });
      this.activeDelays = newDelays;
      this.logger.log(`Synced ${this.activeDelays.size} active trip updates.`);
    } catch (error: any) {
      this.logger.error(`Failed to fetch GTFS-RT TripUpdates: ${error.message}`);
    }
  }

  private async syncVehiclePositions(): Promise<void> {
    try {
      const response = await axios.get(this.VEHICLES_URL, { responseType: 'arraybuffer' });
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(response.data));
      const newVehicles = new Map<string, VehiclePositionState>();

      feed.entity.forEach((entity: any) => {
        const v = entity.vehicle;
        const lat = v?.position?.latitude;
        const lng = v?.position?.longitude;
        if (v && typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
          const vehicleId = v.vehicle?.id || entity.id;
          const timestamp = toNumberOrNull(v.timestamp) ?? Math.floor(Date.now() / 1000);

          let currentStatus = 'IN_TRANSIT_TO';
          const rawStatus = v.currentStatus ?? v.current_status;
          if (rawStatus === 1 || rawStatus === 'STOPPED_AT') currentStatus = 'STOPPED_AT';
          else if (rawStatus === 0 || rawStatus === 'INCOMING_AT') currentStatus = 'INCOMING_AT';
          else if (rawStatus === 2 || rawStatus === 'IN_TRANSIT_TO') currentStatus = 'IN_TRANSIT_TO';

          const rawLabel = v.vehicle?.label || '';
          const labelMatch = rawLabel.match(/\((.+)\)/);
          const headsign =
            v.trip?.tripHeadsign ||
            v.trip?.trip_headsign ||
            (labelMatch ? labelMatch[1] : null) ||
            null;

          newVehicles.set(vehicleId, {
            vehicleId,
            tripId: v.trip?.tripId || v.trip?.trip_id || '',
            routeId: v.trip?.routeId || v.trip?.route_id || '',
            latitude: lat,
            longitude: lng,
            bearing: typeof v.position?.bearing === 'number' ? v.position.bearing : null,
            speed: typeof v.position?.speed === 'number' ? v.position.speed : null,
            timestamp,
            currentStopSequence:
              typeof (v.currentStopSequence ?? v.current_stop_sequence) === 'number'
                ? (v.currentStopSequence ?? v.current_stop_sequence)
                : null,
            currentStatus,
            headsign,
            multiCarriageDetails: (v as any).multiCarriageDetails || (v as any).multi_carriage_details || [],
          });
        }
      });
      this.activeVehicles = newVehicles;
    } catch (error: any) {
      this.logger.error(`Failed to fetch GTFS-RT VehiclePositions: ${error.message}`);
    }
  }

  // Public Accessors for Journey Engine & TIG Gateway Tools
  public getDelayForTrip(tripId: string): TripDelayState | undefined {
    return this.activeDelays.get(tripId);
  }

  public getVehicleState(vehicleIdOrTripId: string): VehiclePositionState | undefined {
    for (const vehicle of this.activeVehicles.values()) {
      if (vehicle.vehicleId === vehicleIdOrTripId || vehicle.tripId === vehicleIdOrTripId) {
        return vehicle;
      }
    }
    return undefined;
  }

  public getAllActiveVehicles(): VehiclePositionState[] {
    return Array.from(this.activeVehicles.values());
  }

  public getAllActiveDelays(): TripDelayState[] {
    return Array.from(this.activeDelays.values());
  }
}
