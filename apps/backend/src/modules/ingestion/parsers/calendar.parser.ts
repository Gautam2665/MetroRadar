import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsCalendarRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class CalendarParser implements TransitParser<GtfsCalendarRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsCalendarRow[]> {
    const filePath = path.join(context.extractedDir, 'calendar.txt');
    const rows: GtfsCalendarRow[] = [];

    context.logger.log('Parsing calendar.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (
          !row.service_id ||
          row.monday === undefined ||
          row.tuesday === undefined ||
          row.wednesday === undefined ||
          row.thursday === undefined ||
          row.friday === undefined ||
          row.saturday === undefined ||
          row.sunday === undefined ||
          !row.start_date ||
          !row.end_date
        ) {
          context.errors.push({
            file: 'calendar.txt',
            line: lineNum,
            message: 'Missing mandatory fields in calendar.txt',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          service_id: row.service_id,
          monday: row.monday,
          tuesday: row.tuesday,
          wednesday: row.wednesday,
          thursday: row.thursday,
          friday: row.friday,
          saturday: row.saturday,
          sunday: row.sunday,
          start_date: row.start_date,
          end_date: row.end_date,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'calendar.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing calendar.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
