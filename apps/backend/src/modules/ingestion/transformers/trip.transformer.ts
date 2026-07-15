import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsTripRow } from '../types/gtfs.types';
import { CanonicalTrip } from '../types/domain.types';

@Injectable()
export class TripTransformer implements TransitTransformer<
  GtfsTripRow,
  CanonicalTrip
> {
  async transform(
    context: PipelineContext,
    rows: GtfsTripRow[],
  ): Promise<CanonicalTrip[]> {
    context.logger.log(`Transforming ${rows.length} trip records to CTM...`);

    const result = rows.map((row) => ({
      lineCode: row.route_id,
      serviceId: row.service_id,
      tripId: row.trip_id,
      tripHeadsign: row.trip_headsign,
      directionId: row.direction_id ? parseInt(row.direction_id) : undefined,
      shapeId: row.shape_id,
    }));

    await Promise.resolve();
    return result;
  }
}
