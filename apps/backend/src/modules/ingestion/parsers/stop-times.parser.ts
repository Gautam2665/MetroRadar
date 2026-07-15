import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsStopTimeRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class StopTimesParser implements TransitParser<GtfsStopTimeRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsStopTimeRow[]> {
    const filePath = path.join(context.extractedDir, 'stop_times.txt');
    const rows: GtfsStopTimeRow[] = [];

    context.logger.log('Parsing stop_times.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (
          !row.trip_id ||
          !row.arrival_time ||
          !row.departure_time ||
          !row.stop_id ||
          !row.stop_sequence
        ) {
          context.errors.push({
            file: 'stop_times.txt',
            line: lineNum,
            message:
              'Missing mandatory fields: trip_id, arrival_time, departure_time, stop_id, or stop_sequence',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          trip_id: row.trip_id,
          arrival_time: row.arrival_time,
          departure_time: row.departure_time,
          stop_id: row.stop_id,
          stop_sequence: row.stop_sequence,
          stop_headsign: row.stop_headsign,
          pickup_type: row.pickup_type,
          drop_off_type: row.drop_off_type,
          continuous_pickup: row.continuous_pickup,
          continuous_drop_off: row.continuous_drop_off,
          shape_dist_traveled: row.shape_dist_traveled,
          timepoint: row.timepoint,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'stop_times.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing stop_times.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
