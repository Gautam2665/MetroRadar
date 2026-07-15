import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsRouteRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class RoutesParser implements TransitParser<GtfsRouteRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsRouteRow[]> {
    const filePath = path.join(context.extractedDir, 'routes.txt');
    const rows: GtfsRouteRow[] = [];

    context.logger.log('Parsing routes.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (!row.route_id || !row.route_type) {
          context.errors.push({
            file: 'routes.txt',
            line: lineNum,
            message: 'Missing mandatory fields: route_id or route_type',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          route_id: row.route_id,
          agency_id: row.agency_id,
          route_short_name: row.route_short_name,
          route_long_name: row.route_long_name,
          route_desc: row.route_desc,
          route_type: row.route_type,
          route_url: row.route_url,
          route_color: row.route_color,
          route_text_color: row.route_text_color,
          route_sort_order: row.route_sort_order,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'routes.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing routes.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
