import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsAgencyRow } from '../types/gtfs.types';
import { CanonicalAgency } from '../types/domain.types';

@Injectable()
export class AgencyTransformer implements TransitTransformer<
  GtfsAgencyRow,
  CanonicalAgency
> {
  async transform(
    context: PipelineContext,
    rows: GtfsAgencyRow[],
  ): Promise<CanonicalAgency[]> {
    context.logger.log(`Transforming ${rows.length} agency records to CTM...`);

    const result = rows.map((row) => ({
      code: `AG_${row.agency_id || row.agency_name.toUpperCase().replace(/\s+/g, '_')}`,
      name: row.agency_name,
      website: row.agency_url,
      contactEmail: row.agency_email,
      phone: row.agency_phone,
      logo: undefined,
    }));

    await Promise.resolve();
    return result;
  }
}
