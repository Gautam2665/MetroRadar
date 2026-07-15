import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsCalendarDateRow } from '../types/gtfs.types';

@Injectable()
export class CalendarDatesNormalizer {
  normalize(
    context: PipelineContext,
    rows: GtfsCalendarDateRow[],
  ): GtfsCalendarDateRow[] {
    const validRows: GtfsCalendarDateRow[] = [];

    rows.forEach((row, index) => {
      const date = (row.date || '').trim();
      const exception_type = parseInt((row.exception_type || '').trim());

      if (date.length !== 8) {
        context.errors.push({
          file: 'calendar_dates.txt',
          line: index + 2,
          message: `Normalization failed: invalid YYYYMMDD date: ${row.date}`,
          severity: 'ERROR',
        });
        return;
      }

      if (
        isNaN(exception_type) ||
        (exception_type !== 1 && exception_type !== 2)
      ) {
        context.errors.push({
          file: 'calendar_dates.txt',
          line: index + 2,
          message: `Normalization failed: invalid exception_type: ${row.exception_type}`,
          severity: 'ERROR',
        });
        return;
      }

      validRows.push({
        service_id: (row.service_id || '').trim(),
        date,
        exception_type: exception_type.toString(),
      });
    });

    return validRows;
  }
}
