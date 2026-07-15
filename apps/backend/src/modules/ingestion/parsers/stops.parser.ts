import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsStopRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class StopsParser implements TransitParser<GtfsStopRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsStopRow[]> {
    const filePath = path.join(context.extractedDir, 'stops.txt');
    const rows: GtfsStopRow[] = [];

    context.logger.log('Parsing stops.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (!row.stop_id || !row.stop_name || !row.stop_lat || !row.stop_lon) {
          context.errors.push({
            file: 'stops.txt',
            line: lineNum,
            message:
              'Missing mandatory fields: stop_id, stop_name, stop_lat, or stop_lon',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          stop_id: row.stop_id,
          stop_code: row.stop_code,
          stop_name: row.stop_name,
          stop_desc: row.stop_desc,
          stop_lat: row.stop_lat,
          stop_lon: row.stop_lon,
          zone_id: row.zone_id,
          stop_url: row.stop_url,
          location_type: row.location_type,
          parent_station: row.parent_station,
          stop_timezone: row.stop_timezone,
          wheelchair_boarding: row.wheelchair_boarding,
          level_id: row.level_id,
          platform_code: row.platform_code,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'stops.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing stops.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
