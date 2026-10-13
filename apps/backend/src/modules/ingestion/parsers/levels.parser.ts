import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { GtfsLevelRow } from '../types/gtfs.types';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class LevelsParser implements TransitParser<GtfsLevelRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsLevelRow[]> {
    const filePath = path.join(context.extractedDir, 'levels.txt');
    const rows: GtfsLevelRow[] = [];
    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (
          !row.level_id ||
          !row.level_index ||
          Number.isNaN(Number(row.level_index))
        ) {
          context.errors.push({
            file: 'levels.txt',
            line: lineNum,
            message: 'Missing or invalid level_id/level_index.',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          level_id: row.level_id.trim(),
          level_index: row.level_index.trim(),
          level_name: row.level_name?.trim() || undefined,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'levels.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );
    context.logger.log(
      `Parsing levels.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
