import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsRouteRow } from '../types/gtfs.types';
import { CanonicalLine } from '../types/domain.types';

@Injectable()
export class LineTransformer implements TransitTransformer<
  GtfsRouteRow,
  CanonicalLine
> {
  async transform(
    context: PipelineContext,
    rows: GtfsRouteRow[],
  ): Promise<CanonicalLine[]> {
    context.logger.log(`Transforming ${rows.length} route records to CTM...`);

    const result = rows.map((row) => ({
      agencyCode: `AG_${row.agency_id || 'DEFAULT'}`,
      code: row.route_id,
      name: row.route_long_name || row.route_short_name || row.route_id,
      color: row.route_color || '#000000',
      status: 'ACTIVE',
    }));

    await Promise.resolve();
    return result;
  }
}
