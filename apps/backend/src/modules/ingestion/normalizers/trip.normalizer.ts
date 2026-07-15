import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsTripRow } from '../types/gtfs.types';

@Injectable()
export class TripNormalizer {
  normalize(context: PipelineContext, rows: GtfsTripRow[]): GtfsTripRow[] {
    return rows.map((row) => {
      const direction_id = (row.direction_id || '').trim();
      let parsedDirection: string | undefined = undefined;
      if (direction_id === '0' || direction_id === '1') {
        parsedDirection = direction_id;
      }

      return {
        route_id: (row.route_id || '').trim(),
        service_id: (row.service_id || '').trim(),
        trip_id: (row.trip_id || '').trim(),
        trip_headsign: (row.trip_headsign || '').trim() || undefined,
        trip_short_name: (row.trip_short_name || '').trim() || undefined,
        direction_id: parsedDirection,
        block_id: (row.block_id || '').trim() || undefined,
        shape_id: (row.shape_id || '').trim() || undefined,
        wheelchair_accessible:
          (row.wheelchair_accessible || '').trim() || undefined,
        bikes_allowed: (row.bikes_allowed || '').trim() || undefined,
      };
    });
  }
}
