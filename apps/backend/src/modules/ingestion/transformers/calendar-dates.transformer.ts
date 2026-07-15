import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsCalendarDateRow } from '../types/gtfs.types';
import { CanonicalCalendarDate } from '../types/domain.types';

@Injectable()
export class CalendarDatesTransformer implements TransitTransformer<
  GtfsCalendarDateRow,
  CanonicalCalendarDate
> {
  async transform(
    context: PipelineContext,
    rows: GtfsCalendarDateRow[],
  ): Promise<CanonicalCalendarDate[]> {
    context.logger.log(
      `Transforming ${rows.length} calendar exception records to CTM...`,
    );

    const parseDate = (dStr: string) => {
      const yr = parseInt(dStr.substring(0, 4));
      const mo = parseInt(dStr.substring(4, 6)) - 1;
      const dy = parseInt(dStr.substring(6, 8));
      return new Date(Date.UTC(yr, mo, dy));
    };

    const result = rows.map((row) => ({
      serviceId: row.service_id,
      date: parseDate(row.date),
      exceptionType: parseInt(row.exception_type),
    }));

    await Promise.resolve();
    return result;
  }
}
