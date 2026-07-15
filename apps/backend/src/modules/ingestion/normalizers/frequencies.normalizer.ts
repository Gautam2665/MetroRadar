import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsFrequencyRow } from '../types/gtfs.types';

@Injectable()
export class FrequenciesNormalizer {
  normalize(
    context: PipelineContext,
    rows: GtfsFrequencyRow[],
  ): GtfsFrequencyRow[] {
    const validRows: GtfsFrequencyRow[] = [];

    rows.forEach((row, index) => {
      const headway_secs = parseInt((row.headway_secs || '').trim());

      if (isNaN(headway_secs) || headway_secs <= 0) {
        context.errors.push({
          file: 'frequencies.txt',
          line: index + 2,
          message: `Normalization failed: invalid headway_secs: ${row.headway_secs}`,
          severity: 'ERROR',
        });
        return;
      }

      validRows.push({
        trip_id: (row.trip_id || '').trim(),
        start_time: (row.start_time || '').trim(),
        end_time: (row.end_time || '').trim(),
        headway_secs: headway_secs.toString(),
        exact_times: (row.exact_times || '').trim() || undefined,
      });
    });

    return validRows;
  }
}
