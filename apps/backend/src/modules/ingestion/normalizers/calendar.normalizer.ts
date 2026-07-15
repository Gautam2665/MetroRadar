import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsCalendarRow } from '../types/gtfs.types';

@Injectable()
export class CalendarNormalizer {
  normalize(
    context: PipelineContext,
    rows: GtfsCalendarRow[],
  ): GtfsCalendarRow[] {
    const validRows: GtfsCalendarRow[] = [];

    rows.forEach((row, index) => {
      const start_date = (row.start_date || '').trim();
      const end_date = (row.end_date || '').trim();

      if (start_date.length !== 8 || end_date.length !== 8) {
        context.errors.push({
          file: 'calendar.txt',
          line: index + 2,
          message: `Normalization failed: invalid YYYYMMDD date format (start: ${row.start_date}, end: ${row.end_date})`,
          severity: 'ERROR',
        });
        return;
      }

      validRows.push({
        service_id: (row.service_id || '').trim(),
        monday: (row.monday || '').trim(),
        tuesday: (row.tuesday || '').trim(),
        wednesday: (row.wednesday || '').trim(),
        thursday: (row.thursday || '').trim(),
        friday: (row.friday || '').trim(),
        saturday: (row.saturday || '').trim(),
        sunday: (row.sunday || '').trim(),
        start_date,
        end_date,
      });
    });

    return validRows;
  }
}
