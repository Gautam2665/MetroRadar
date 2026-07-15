import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsCalendarRow } from '../types/gtfs.types';
import { CanonicalCalendar } from '../types/domain.types';

@Injectable()
export class CalendarTransformer implements TransitTransformer<
  GtfsCalendarRow,
  CanonicalCalendar
> {
  async transform(
    context: PipelineContext,
    rows: GtfsCalendarRow[],
  ): Promise<CanonicalCalendar[]> {
    context.logger.log(
      `Transforming ${rows.length} calendar records to CTM...`,
    );

    const parseDate = (dStr: string) => {
      const yr = parseInt(dStr.substring(0, 4));
      const mo = parseInt(dStr.substring(4, 6)) - 1;
      const dy = parseInt(dStr.substring(6, 8));
      return new Date(Date.UTC(yr, mo, dy));
    };

    const result = rows.map((row) => ({
      serviceId: row.service_id,
      monday: row.monday === '1',
      tuesday: row.tuesday === '1',
      wednesday: row.wednesday === '1',
      thursday: row.thursday === '1',
      friday: row.friday === '1',
      saturday: row.saturday === '1',
      sunday: row.sunday === '1',
      startDate: parseDate(row.start_date),
      endDate: parseDate(row.end_date),
    }));

    await Promise.resolve();
    return result;
  }
}
