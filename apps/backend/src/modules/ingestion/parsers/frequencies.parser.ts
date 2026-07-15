import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsFrequencyRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class FrequenciesParser implements TransitParser<GtfsFrequencyRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsFrequencyRow[]> {
    const filePath = path.join(context.extractedDir, 'frequencies.txt');
    const rows: GtfsFrequencyRow[] = [];

    context.logger.log('Parsing frequencies.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (
          !row.trip_id ||
          !row.start_time ||
          !row.end_time ||
          !row.headway_secs
        ) {
          context.errors.push({
            file: 'frequencies.txt',
            line: lineNum,
            message:
              'Missing mandatory fields: trip_id, start_time, end_time, or headway_secs',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          trip_id: row.trip_id,
          start_time: row.start_time,
          end_time: row.end_time,
          headway_secs: row.headway_secs,
          exact_times: row.exact_times,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'frequencies.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing frequencies.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
