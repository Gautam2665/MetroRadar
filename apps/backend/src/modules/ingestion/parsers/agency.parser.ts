import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { TransitParser } from '../interfaces/transit-parser.interface';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsAgencyRow } from '../types/gtfs.types';
import { CsvReaderService } from '../services/csv-reader.service';

@Injectable()
export class AgencyParser implements TransitParser<GtfsAgencyRow> {
  constructor(private readonly csvReader: CsvReaderService) {}

  async parse(context: PipelineContext): Promise<GtfsAgencyRow[]> {
    const filePath = path.join(context.extractedDir, 'agency.txt');
    const rows: GtfsAgencyRow[] = [];

    context.logger.log('Parsing agency.txt started...');

    await this.csvReader.readCsv(
      filePath,
      async (row, lineNum) => {
        if (!row.agency_name || !row.agency_url) {
          context.errors.push({
            file: 'agency.txt',
            line: lineNum,
            message: 'Missing mandatory fields: agency_name or agency_url',
            severity: 'ERROR',
            rawData: JSON.stringify(row),
          });
          return;
        }
        rows.push({
          agency_id: row.agency_id,
          agency_name: row.agency_name,
          agency_url: row.agency_url,
          agency_timezone: row.agency_timezone,
          agency_lang: row.agency_lang,
          agency_phone: row.agency_phone,
          agency_fare_url: row.agency_fare_url,
          agency_email: row.agency_email,
        });
        await Promise.resolve();
      },
      (err, lineNum) => {
        context.errors.push({
          file: 'agency.txt',
          line: lineNum,
          message: err.message,
          severity: 'ERROR',
        });
      },
    );

    context.logger.log(
      `Parsing agency.txt complete. Found ${rows.length} rows.`,
    );
    return rows;
  }
}
