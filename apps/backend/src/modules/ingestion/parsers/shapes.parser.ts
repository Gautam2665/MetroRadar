import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsShapeRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class ShapesParser implements TransitParser<GtfsShapeRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsShapeRow[]> {
    const filePath = path.join(context.extractedDir, 'shapes.txt');
    const rows: GtfsShapeRow[] = [];

    context.logger.log('Parsing shapes.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (
          !row.shape_id ||
          !row.shape_pt_lat ||
          !row.shape_pt_lon ||
          !row.shape_pt_sequence
        ) {
          context.errors.push({
            file: 'shapes.txt',
            line: lineNum,
            message:
              'Missing mandatory fields: shape_id, shape_pt_lat, shape_pt_lon, or shape_pt_sequence',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          shape_id: row.shape_id,
          shape_pt_lat: row.shape_pt_lat,
          shape_pt_lon: row.shape_pt_lon,
          shape_pt_sequence: row.shape_pt_sequence,
          shape_dist_traveled: row.shape_dist_traveled,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'shapes.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing shapes.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
