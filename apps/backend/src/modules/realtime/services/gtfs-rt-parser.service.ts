import { Injectable, Logger } from '@nestjs/common';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { NormalizedVehicle } from '../interfaces/gtfs-realtime.interface';

@Injectable()
export class GtfsRtParserService {
  private readonly logger = new Logger(GtfsRtParserService.name);

  parseVehiclePositions(buffer: Buffer): NormalizedVehicle[] {
    const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    const vehicles: NormalizedVehicle[] = [];

    for (const entity of feed.entity) {
      if (!entity.vehicle) continue;

      const v = entity.vehicle;
      const pos = v.position;

      if (!pos?.latitude || !pos?.longitude) continue;

      vehicles.push({
        vehicleId: v.vehicle?.id ?? entity.id,
        tripId: v.trip?.tripId ?? null,
        routeId: v.trip?.routeId ?? null,
        latitude: pos.latitude,
        longitude: pos.longitude,
        bearing: pos.bearing ?? null,
        speed: pos.speed ?? null,
        currentStopSequence: v.currentStopSequence ?? null,
        currentStatus:
          v.currentStatus != null
            ? transit_realtime.VehiclePosition.VehicleStopStatus[
                v.currentStatus
              ]
            : null,
        timestamp:
          typeof v.timestamp === 'number'
            ? v.timestamp
            : ((v.timestamp as unknown as Long)?.toNumber?.() ?? null),
      });
    }

    this.logger.log(`[OTD] Parsed ${vehicles.length} vehicle positions`);
    return vehicles;
  }
}
