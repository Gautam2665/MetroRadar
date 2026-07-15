import { Injectable } from '@nestjs/common';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { TransitTransformer } from '../interfaces/transit-parser.interface';
import { GtfsStopRow } from '../types/gtfs.types';
import { CanonicalStation } from '../types/domain.types';

@Injectable()
export class StationTransformer implements TransitTransformer<
  GtfsStopRow,
  CanonicalStation
> {
  async transform(
    context: PipelineContext,
    rows: GtfsStopRow[],
  ): Promise<CanonicalStation[]> {
    context.logger.log(`Transforming ${rows.length} stop records to CTM...`);

    // In GTFS, stops with location_type = 1 are stations.
    // Stops with location_type = 0 are child stops (e.g. platforms).
    // The requirement says:
    // "Parent stations map to Station. Child stops map to Platform. If a child stop has no parent station, create a default Station."
    // In our transformer, we convert stops into CanonicalStation CTM objects.
    // If a stop has a parent_station, its code remains its parent_station or its own stop_id depending on how we group it.
    // To make sure all stop_id references in stop_times remain valid, we'll output a CanonicalStation for:
    // - Every parent station (location_type = 1).
    // - Every child stop that doesn't have a parent station.
    const result: CanonicalStation[] = [];
    const stationsAdded = new Set<string>();

    rows.forEach((row) => {
      const isStation = row.location_type === '1';
      const hasParent = !!row.parent_station;

      if (isStation) {
        if (!stationsAdded.has(row.stop_id)) {
          stationsAdded.add(row.stop_id);
          result.push(this.mapToCanonical(row));
        }
      } else if (!hasParent) {
        // Create default station container for parent-less child stops
        const fakeParentId = `ST_${row.stop_id}`;
        if (!stationsAdded.has(fakeParentId)) {
          stationsAdded.add(fakeParentId);
          result.push({
            code: fakeParentId,
            name: row.stop_name,
            latitude: parseFloat(row.stop_lat),
            longitude: parseFloat(row.stop_lon),
            timezone: row.stop_timezone,
            wheelchairAccessible: row.wheelchair_boarding === '1',
          });
        }
      }
    });

    await Promise.resolve();
    return result;
  }

  private mapToCanonical(row: GtfsStopRow): CanonicalStation {
    return {
      code: row.stop_id,
      name: row.stop_name,
      latitude: parseFloat(row.stop_lat),
      longitude: parseFloat(row.stop_lon),
      timezone: row.stop_timezone,
      wheelchairAccessible: row.wheelchair_boarding === '1',
    };
  }
}
