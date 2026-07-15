import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsStopTimeRow } from '../types/gtfs.types';
import { CanonicalStopTime } from '../types/domain.types';

@Injectable()
export class StopTimesTransformer implements TransitTransformer<
  GtfsStopTimeRow,
  CanonicalStopTime
> {
  async transform(
    context: PipelineContext,
    rows: GtfsStopTimeRow[],
  ): Promise<CanonicalStopTime[]> {
    context.logger.log(
      `Transforming ${rows.length} stop-time records to CTM...`,
    );

    const result = rows.map((row) => ({
      tripId: row.trip_id,
      stationCode: row.stop_id,
      arrivalTime: row.arrival_time,
      departureTime: row.departure_time,
      stopSequence: parseInt(row.stop_sequence),
      stopHeadsign: row.stop_headsign,
      pickupType: row.pickup_type ? parseInt(row.pickup_type) : undefined,
      dropOffType: row.drop_off_type ? parseInt(row.drop_off_type) : undefined,
    }));

    await Promise.resolve();
    return result;
  }
}
