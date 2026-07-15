import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsShapeRow } from '../types/gtfs.types';
import { CanonicalShape } from '../types/domain.types';

@Injectable()
export class ShapesTransformer implements TransitTransformer<
  GtfsShapeRow,
  CanonicalShape
> {
  async transform(
    context: PipelineContext,
    rows: GtfsShapeRow[],
  ): Promise<CanonicalShape[]> {
    context.logger.log(`Transforming ${rows.length} shape records to CTM...`);

    const result = rows.map((row) => ({
      shapeId: row.shape_id,
      latitude: parseFloat(row.shape_pt_lat),
      longitude: parseFloat(row.shape_pt_lon),
      sequence: parseInt(row.shape_pt_sequence),
      distTraveled: row.shape_dist_traveled
        ? parseFloat(row.shape_dist_traveled)
        : undefined,
    }));

    await Promise.resolve();
    return result;
  }
}
