import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsTripRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class TripsParser implements TransitParser<GtfsTripRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsTripRow[]> {
    const filePath = path.join(context.extractedDir, 'trips.txt');
    const rows: GtfsTripRow[] = [];

    context.logger.log('Parsing trips.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (!row.route_id || !row.service_id || !row.trip_id) {
          context.errors.push({
            file: 'trips.txt',
            line: lineNum,
            message:
              'Missing mandatory fields: route_id, service_id, or trip_id',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          route_id: row.route_id,
          service_id: row.service_id,
          trip_id: row.trip_id,
          trip_headsign: row.trip_headsign,
          trip_short_name: row.trip_short_name,
          direction_id: row.direction_id,
          block_id: row.block_id,
          shape_id: row.shape_id,
          wheelchair_accessible: row.wheelchair_accessible,
          bikes_allowed: row.bikes_allowed,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'trips.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing trips.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
