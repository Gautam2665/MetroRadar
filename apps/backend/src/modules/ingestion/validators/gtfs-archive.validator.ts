import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PipelineContext } from '../interfaces/pipeline-context.interface';

@Injectable()
export class GtfsArchiveValidator {
  validateArchive(context: PipelineContext): boolean {
    const requiredFiles = [
      'agency.txt',
      'stops.txt',
      'routes.txt',
      'trips.txt',
      'stop_times.txt',
    ];
    let isValid = true;

    for (const file of requiredFiles) {
      const filePath = path.join(context.extractedDir, file);
      if (!fs.existsSync(filePath)) {
        context.errors.push({
          file: 'archive',
          message: `Missing required file: ${file}`,
          severity: 'CRITICAL',
        });
        isValid = false;
      }
    }

    const calendarExists = fs.existsSync(
      path.join(context.extractedDir, 'calendar.txt'),
    );
    const calendarDatesExists = fs.existsSync(
      path.join(context.extractedDir, 'calendar_dates.txt'),
    );

    if (!calendarExists && !calendarDatesExists) {
      context.errors.push({
        file: 'archive',
        message:
          'Must contain at least one of calendar.txt or calendar_dates.txt',
        severity: 'CRITICAL',
      });
      isValid = false;
    }

    return isValid;
  }
}
