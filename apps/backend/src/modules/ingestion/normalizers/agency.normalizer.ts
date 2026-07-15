import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsAgencyRow } from '../types/gtfs.types';

@Injectable()
export class AgencyNormalizer {
  normalize(context: PipelineContext, rows: GtfsAgencyRow[]): GtfsAgencyRow[] {
    return rows.map((row, index) => {
      const agency_id = (row.agency_id || '').trim();
      const agency_name = (row.agency_name || '').trim();
      const agency_url = (row.agency_url || '').trim();
      const agency_timezone = (row.agency_timezone || '').trim();

      if (!agency_name || !agency_url) {
        context.errors.push({
          file: 'agency.txt',
          line: index + 2,
          message: 'Normalization failed: missing mandatory fields after trim',
          severity: 'ERROR',
        });
      }

      return {
        agency_id: agency_id || 'default',
        agency_name,
        agency_url,
        agency_timezone,
        agency_lang: (row.agency_lang || '').trim() || undefined,
        agency_phone: (row.agency_phone || '').trim() || undefined,
        agency_fare_url: (row.agency_fare_url || '').trim() || undefined,
        agency_email: (row.agency_email || '').trim() || undefined,
      };
    });
  }
}
