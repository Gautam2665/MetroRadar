import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsStopRow } from '../types/gtfs.types';
import { CoordinatesValidator } from '../validators/coordinates.validator';

@Injectable()
export class StationNormalizer {
  normalize(context: PipelineContext, rows: GtfsStopRow[]): GtfsStopRow[] {
    const validRows: GtfsStopRow[] = [];

    rows.forEach((row, index) => {
      const stop_id = (row.stop_id || '').trim();
      const stop_name = (row.stop_name || '').trim();
      const stop_lat = parseFloat((row.stop_lat || '').trim());
      const stop_lon = parseFloat((row.stop_lon || '').trim());

      if (isNaN(stop_lat) || isNaN(stop_lon)) {
        context.errors.push({
          file: 'stops.txt',
          line: index + 2,
          message: `Normalization failed: invalid coordinate floats (lat: ${row.stop_lat}, lon: ${row.stop_lon})`,
          severity: 'ERROR',
        });
        return;
      }

      if (!CoordinatesValidator.isValid(stop_lat, stop_lon)) {
        context.errors.push({
          file: 'stops.txt',
          line: index + 2,
          message: `Normalization failed: coordinates out of bounds (lat: ${stop_lat}, lon: ${stop_lon})`,
          severity: 'ERROR',
        });
        return;
      }

      validRows.push({
        stop_id,
        stop_code: (row.stop_code || '').trim() || undefined,
        stop_name,
        stop_desc: (row.stop_desc || '').trim() || undefined,
        stop_lat: stop_lat.toString(),
        stop_lon: stop_lon.toString(),
        zone_id: (row.zone_id || '').trim() || undefined,
        stop_url: (row.stop_url || '').trim() || undefined,
        location_type: (row.location_type || '').trim() || '0',
        parent_station: (row.parent_station || '').trim() || undefined,
        stop_timezone: (row.stop_timezone || '').trim() || undefined,
        wheelchair_boarding: (row.wheelchair_boarding || '').trim() || '0',
        level_id: (row.level_id || '').trim() || undefined,
        platform_code: (row.platform_code || '').trim() || undefined,
      });
    });

    return validRows;
  }
}
