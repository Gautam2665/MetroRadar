import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsStopTimeRow } from '../types/gtfs.types';

@Injectable()
export class StopTimesNormalizer {
  normalize(
    context: PipelineContext,
    rows: GtfsStopTimeRow[],
  ): GtfsStopTimeRow[] {
    const validRows: GtfsStopTimeRow[] = [];

    rows.forEach((row, index) => {
      const stop_sequence = parseInt((row.stop_sequence || '').trim());
      if (isNaN(stop_sequence)) {
        context.errors.push({
          file: 'stop_times.txt',
          line: index + 2,
          message: `Normalization failed: invalid stop_sequence: ${row.stop_sequence}`,
          severity: 'ERROR',
        });
        return;
      }

      validRows.push({
        trip_id: (row.trip_id || '').trim(),
        arrival_time: (row.arrival_time || '').trim(),
        departure_time: (row.departure_time || '').trim(),
        stop_id: (row.stop_id || '').trim(),
        stop_sequence: stop_sequence.toString(),
        stop_headsign: (row.stop_headsign || '').trim() || undefined,
        pickup_type: (row.pickup_type || '').trim() || '0',
        drop_off_type: (row.drop_off_type || '').trim() || '0',
        continuous_pickup: (row.continuous_pickup || '').trim() || undefined,
        continuous_drop_off:
          (row.continuous_drop_off || '').trim() || undefined,
        shape_dist_traveled:
          (row.shape_dist_traveled || '').trim() || undefined,
        timepoint: (row.timepoint || '').trim() || undefined,
      });
    });

    return validRows;
  }
}
