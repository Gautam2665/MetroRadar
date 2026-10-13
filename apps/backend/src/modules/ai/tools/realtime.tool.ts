import { Injectable } from '@nestjs/common';
import { GtfsRtSyncService } from '../../realtime/services/gtfs-rt-sync.service';

@Injectable()
export class RealtimeTool {
  constructor(private readonly gtfsRtSync: GtfsRtSyncService) {}

  public async getRealtimeState(args: { tripId?: string; routeId?: string }) {
    if (args.tripId) {
      const delay = this.gtfsRtSync.getDelayForTrip(args.tripId);
      const vehicle = this.gtfsRtSync.getVehicleState(args.tripId);

      return {
        tripId: args.tripId,
        isRealtimeAvailable: Boolean(delay || vehicle),
        delaySeconds: delay ? delay.delaySeconds : 0,
        delayMinutes: delay ? Math.round(delay.delaySeconds / 60) : 0,
        position: vehicle
          ? { lat: vehicle.latitude, lon: vehicle.longitude }
          : null,
        coachOccupancy: vehicle?.multiCarriageDetails || [],
      };
    }

    return {
      status: 'OPERATIONAL',
      message: 'Route operating within standard schedule.',
    };
  }
}
