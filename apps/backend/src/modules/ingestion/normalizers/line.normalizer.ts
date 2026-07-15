import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsRouteRow } from '../types/gtfs.types';

@Injectable()
export class LineNormalizer {
  normalize(context: PipelineContext, rows: GtfsRouteRow[]): GtfsRouteRow[] {
    return rows.map((row) => {
      let route_color = (row.route_color || '').trim().toUpperCase();
      if (route_color && !route_color.startsWith('#')) {
        route_color = `#${route_color}`;
      }
      if (!route_color) {
        route_color = '#000000'; // fallback
      }

      return {
        route_id: (row.route_id || '').trim(),
        agency_id: (row.agency_id || '').trim() || undefined,
        route_short_name: (row.route_short_name || '').trim() || undefined,
        route_long_name: (row.route_long_name || '').trim() || undefined,
        route_desc: (row.route_desc || '').trim() || undefined,
        route_type: (row.route_type || '').trim(),
        route_url: (row.route_url || '').trim() || undefined,
        route_color,
        route_text_color: (row.route_text_color || '').trim() || undefined,
        route_sort_order: (row.route_sort_order || '').trim() || undefined,
      };
    });
  }
}
