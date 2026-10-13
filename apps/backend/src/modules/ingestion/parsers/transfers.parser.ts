import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { CsvReaderService } from '../services/csv-reader.service';
import { GtfsTransferRow } from '../types/gtfs.types';

@Injectable()
export class TransfersParser implements TransitParser<GtfsTransferRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsTransferRow[]> {
    const filePath = path.join(context.extractedDir, 'transfers.txt');
    const rows: GtfsTransferRow[] = [];
    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (!row.from_stop_id || !row.to_stop_id) {
          context.errors.push({
            file: 'transfers.txt',
            line: lineNum,
            message: 'Missing mandatory from_stop_id or to_stop_id.',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          from_stop_id: row.from_stop_id.trim(),
          to_stop_id: row.to_stop_id.trim(),
          transfer_type: row.transfer_type?.trim() || undefined,
          min_transfer_time: row.min_transfer_time?.trim() || undefined,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'transfers.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );
    context.logger.log(
      `Parsing transfers.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
