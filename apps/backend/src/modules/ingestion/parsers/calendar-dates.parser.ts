import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsCalendarDateRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class CalendarDatesParser implements TransitParser<GtfsCalendarDateRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsCalendarDateRow[]> {
    const filePath = path.join(context.extractedDir, 'calendar_dates.txt');
    const rows: GtfsCalendarDateRow[] = [];

    context.logger.log('Parsing calendar_dates.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (!row.service_id || !row.date || !row.exception_type) {
          context.errors.push({
            file: 'calendar_dates.txt',
            line: lineNum,
            message:
              'Missing mandatory fields: service_id, date, or exception_type',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          service_id: row.service_id,
          date: row.date,
          exception_type: row.exception_type,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'calendar_dates.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing calendar_dates.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
