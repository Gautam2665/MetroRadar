import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsShapeRow } from '../types/gtfs.types';
import { CoordinatesValidator } from '../validators/coordinates.validator';

@Injectable()
export class ShapesNormalizer {
  normalize(context: PipelineContext, rows: GtfsShapeRow[]): GtfsShapeRow[] {
    const validRows: GtfsShapeRow[] = [];

    rows.forEach((row, index) => {
      const shape_id = (row.shape_id || '').trim();
      const shape_pt_lat = parseFloat((row.shape_pt_lat || '').trim());
      const shape_pt_lon = parseFloat((row.shape_pt_lon || '').trim());
      const shape_pt_sequence = parseInt((row.shape_pt_sequence || '').trim());

      if (isNaN(shape_pt_lat) || isNaN(shape_pt_lon)) {
        context.errors.push({
          file: 'shapes.txt',
          line: index + 2,
          message: `Normalization failed: invalid shape coordinates (lat: ${row.shape_pt_lat}, lon: ${row.shape_pt_lon})`,
          severity: 'ERROR',
        });
        return;
      }

      if (!CoordinatesValidator.isValid(shape_pt_lat, shape_pt_lon)) {
        context.errors.push({
          file: 'shapes.txt',
          line: index + 2,
          message: `Normalization failed: coordinates out of bounds (lat: ${shape_pt_lat}, lon: ${shape_pt_lon})`,
          severity: 'ERROR',
        });
        return;
      }

      if (isNaN(shape_pt_sequence)) {
        context.errors.push({
          file: 'shapes.txt',
          line: index + 2,
          message: `Normalization failed: invalid shape_pt_sequence: ${row.shape_pt_sequence}`,
          severity: 'ERROR',
        });
        return;
      }

      validRows.push({
        shape_id,
        shape_pt_lat: shape_pt_lat.toString(),
        shape_pt_lon: shape_pt_lon.toString(),
        shape_pt_sequence: shape_pt_sequence.toString(),
        shape_dist_traveled:
          (row.shape_dist_traveled || '').trim() || undefined,
      });
    });

    return validRows;
  }
}
