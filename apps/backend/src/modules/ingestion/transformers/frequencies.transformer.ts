import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsFrequencyRow } from '../types/gtfs.types';
import { CanonicalFrequency } from '../types/domain.types';

@Injectable()
export class FrequenciesTransformer implements TransitTransformer<
  GtfsFrequencyRow,
  CanonicalFrequency
> {
  async transform(
    context: PipelineContext,
    rows: GtfsFrequencyRow[],
  ): Promise<CanonicalFrequency[]> {
    context.logger.log(
      `Transforming ${rows.length} frequency records to CTM...`,
    );

    const result = rows.map((row) => ({
      tripId: row.trip_id,
      startTime: row.start_time,
      endTime: row.end_time,
      headwaySecs: parseInt(row.headway_secs),
      exactTimes: row.exact_times ? parseInt(row.exact_times) : undefined,
    }));

    await Promise.resolve();
    return result;
  }
}
