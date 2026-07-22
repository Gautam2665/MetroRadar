import { Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import * as path from 'path';
import * as fs from 'fs';
import { ImportSessionStatus } from '@prisma/client';
import {
  PipelineContext,
  PipelineError,
  PipelineStats,
} from '../interfaces/pipeline-context.interface';

// Services
import { ArchiveService } from './archive.service';
import { ImportSessionService } from './import-session.service';

// Importer
import { TransitImporter } from '../importers/transit.importer';

// Validators
import { GtfsArchiveValidator } from '../validators/gtfs-archive.validator';

// Parsers
import { AgencyParser } from '../parsers/agency.parser';
import { StopsParser } from '../parsers/stops.parser';
import { RoutesParser } from '../parsers/routes.parser';
import { CalendarParser } from '../parsers/calendar.parser';
import { CalendarDatesParser } from '../parsers/calendar-dates.parser';
import { ShapesParser } from '../parsers/shapes.parser';
import { TripsParser } from '../parsers/trips.parser';
import { StopTimesParser } from '../parsers/stop-times.parser';
import { FrequenciesParser } from '../parsers/frequencies.parser';

// Normalizers
import { AgencyNormalizer } from '../normalizers/agency.normalizer';
import { StationNormalizer } from '../normalizers/station.normalizer';
import { LineNormalizer } from '../normalizers/line.normalizer';
import { TripNormalizer } from '../normalizers/trip.normalizer';
import { StopTimesNormalizer } from '../normalizers/stop-times.normalizer';
import { CalendarNormalizer } from '../normalizers/calendar.normalizer';
import { CalendarDatesNormalizer } from '../normalizers/calendar-dates.normalizer';
import { ShapesNormalizer } from '../normalizers/shapes.normalizer';
import { FrequenciesNormalizer } from '../normalizers/frequencies.normalizer';

// Transformers
import { AgencyTransformer } from '../transformers/agency.transformer';
import { StationTransformer } from '../transformers/station.transformer';
import { LineTransformer } from '../transformers/line.transformer';
import { TripTransformer } from '../transformers/trip.transformer';
import { StopTimesTransformer } from '../transformers/stop-times.transformer';
import { CalendarTransformer } from '../transformers/calendar.transformer';
import { CalendarDatesTransformer } from '../transformers/calendar-dates.transformer';
import { ShapesTransformer } from '../transformers/shapes.transformer';
import { FrequenciesTransformer } from '../transformers/frequencies.transformer';

@Injectable()
export class IngestionService {
  private readonly nestLogger = new Logger(IngestionService.name);

  constructor(
    private readonly archiveService: ArchiveService,
    private readonly sessionService: ImportSessionService,
    private readonly importer: TransitImporter,
    private readonly archiveValidator: GtfsArchiveValidator,

    // Parsers
    private readonly agencyParser: AgencyParser,
    private readonly stopsParser: StopsParser,
    private readonly routesParser: RoutesParser,
    private readonly calendarParser: CalendarParser,
    private readonly calendarDatesParser: CalendarDatesParser,
    private readonly shapesParser: ShapesParser,
    private readonly tripsParser: TripsParser,
    private readonly stopTimesParser: StopTimesParser,
    private readonly frequenciesParser: FrequenciesParser,

    // Normalizers
    private readonly agencyNormalizer: AgencyNormalizer,
    private readonly stationNormalizer: StationNormalizer,
    private readonly lineNormalizer: LineNormalizer,
    private readonly tripNormalizer: TripNormalizer,
    private readonly stopTimesNormalizer: StopTimesNormalizer,
    private readonly calendarNormalizer: CalendarNormalizer,
    private readonly calendarDatesNormalizer: CalendarDatesNormalizer,
    private readonly shapesNormalizer: ShapesNormalizer,
    private readonly frequenciesNormalizer: FrequenciesNormalizer,

    // Transformers
    private readonly agencyTransformer: AgencyTransformer,
    private readonly stationTransformer: StationTransformer,
    private readonly lineTransformer: LineTransformer,
    private readonly tripTransformer: TripTransformer,
    private readonly stopTimesTransformer: StopTimesTransformer,
    private readonly calendarTransformer: CalendarTransformer,
    private readonly calendarDatesTransformer: CalendarDatesTransformer,
    private readonly shapesTransformer: ShapesTransformer,
    private readonly frequenciesTransformer: FrequenciesTransformer,
    @Optional() private readonly redisService: RedisService,
  ) {}

  async ingestGtfs(
    systemId: string,
    fileBuffer: Buffer,
    filename: string,
    dryRun = false,
  ): Promise<any> {
    const session = await this.sessionService.createSession(
      systemId,
      filename,
      'GTFS_STATIC',
    );
    const sessionId = session.id;

    const extractedDir = path.join(process.cwd(), 'temp_extracts', sessionId);
    const errors: PipelineError[] = [];
    const stats: Record<string, PipelineStats> = {};

    const logger = {
      log: (msg: string) =>
        this.nestLogger.log(`[Session ${sessionId}] ${msg}`),
      warn: (msg: string) =>
        this.nestLogger.warn(`[Session ${sessionId}] ${msg}`),
      error: (msg: string) =>
        this.nestLogger.error(`[Session ${sessionId}] ${msg}`),
    };

    const context: PipelineContext = {
      sessionId,
      systemId,
      dryRun,
      extractedDir,
      errors,
      stats,
      logger,
    };

    logger.log('Import Started');

    try {
      // 1. EXTRACT ARCHIVE
      this.archiveService.extractZip(fileBuffer, extractedDir);
      logger.log('Archive Extracted');

      // 2. VALIDATE ARCHIVE STRUCTURE
      const isStructureValid = this.archiveValidator.validateArchive(context);
      if (!isStructureValid) {
        throw new Error('GTFS archive structure validation failed.');
      }
      logger.log('Validation Complete');

      // 3. PIPELINE STAGE: AGENCY
      if (fs.existsSync(path.join(extractedDir, 'agency.txt'))) {
        const rawAgencies = await this.agencyParser.parse(context);
        const normalized = this.agencyNormalizer.normalize(
          context,
          rawAgencies,
        );
        const domain = await this.agencyTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importAgencies(context, domain);
      }

      // 4. PIPELINE STAGE: STOPS (STATIONS)
      if (fs.existsSync(path.join(extractedDir, 'stops.txt'))) {
        const rawStops = await this.stopsParser.parse(context);
        const normalized = this.stationNormalizer.normalize(context, rawStops);
        const domain = await this.stationTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importStations(context, domain);
      }

      // 5. PIPELINE STAGE: ROUTES (LINES)
      if (fs.existsSync(path.join(extractedDir, 'routes.txt'))) {
        const rawRoutes = await this.routesParser.parse(context);
        const normalized = this.lineNormalizer.normalize(context, rawRoutes);
        const domain = await this.lineTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importLines(context, domain);
      }

      // 6. PIPELINE STAGE: CALENDAR
      if (fs.existsSync(path.join(extractedDir, 'calendar.txt'))) {
        const rawCalendar = await this.calendarParser.parse(context);
        const normalized = this.calendarNormalizer.normalize(
          context,
          rawCalendar,
        );
        const domain = await this.calendarTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importCalendars(context, domain);
      }

      // 7. PIPELINE STAGE: CALENDAR DATES
      if (fs.existsSync(path.join(extractedDir, 'calendar_dates.txt'))) {
        const rawDates = await this.calendarDatesParser.parse(context);
        const normalized = this.calendarDatesNormalizer.normalize(
          context,
          rawDates,
        );
        const domain = await this.calendarDatesTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importCalendarDates(context, domain);
      }

      // 8. PIPELINE STAGE: SHAPES
      if (fs.existsSync(path.join(extractedDir, 'shapes.txt'))) {
        const rawShapes = await this.shapesParser.parse(context);
        const normalized = this.shapesNormalizer.normalize(context, rawShapes);
        const domain = await this.shapesTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importShapes(context, domain);
      }

      // 9. PIPELINE STAGE: TRIPS
      if (fs.existsSync(path.join(extractedDir, 'trips.txt'))) {
        const rawTrips = await this.tripsParser.parse(context);
        const normalized = this.tripNormalizer.normalize(context, rawTrips);
        const domain = await this.tripTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importTrips(context, domain);
      }

      // 10. PIPELINE STAGE: STOP TIMES
      if (fs.existsSync(path.join(extractedDir, 'stop_times.txt'))) {
        const rawStopTimes = await this.stopTimesParser.parse(context);
        const normalized = this.stopTimesNormalizer.normalize(
          context,
          rawStopTimes,
        );
        const domain = await this.stopTimesTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importStopTimes(context, domain);
      }

      // 11. PIPELINE STAGE: FREQUENCIES
      if (fs.existsSync(path.join(extractedDir, 'frequencies.txt'))) {
        const rawFreq = await this.frequenciesParser.parse(context);
        const normalized = this.frequenciesNormalizer.normalize(
          context,
          rawFreq,
        );
        const domain = await this.frequenciesTransformer.transform(
          context,
          normalized,
        );
        await this.importer.importFrequencies(context, domain);
      }

      logger.log('Database Import Complete');

      // 12. FINISH SESSION STATUS DETERMINATION
      const errCount = context.errors.filter(
        (e) => e.severity === 'ERROR' || e.severity === 'CRITICAL',
      ).length;
      const warnCount = context.errors.filter(
        (e) => e.severity === 'WARNING',
      ).length;
      const finalStatus =
        errCount > 0
          ? ImportSessionStatus.PARTIAL
          : ImportSessionStatus.SUCCESS;

      const report = this.generateReportJson(context, finalStatus);

      // Write session and errors to Database
      if (!dryRun) {
        await this.sessionService.addErrors(sessionId, context.errors);
      }
      await this.sessionService.completeSession(
        sessionId,
        finalStatus,
        stats,
        errCount,
        warnCount,
        report,
      );

      if (finalStatus === ImportSessionStatus.SUCCESS && this.redisService) {
        await this.redisService.delByPattern('geojson:*');
        await this.redisService.delByPattern('digitaltwin:*');
        await this.redisService.delByPattern('search:*');
        await this.redisService.delByPattern('nearby:*');
        logger.log(
          'Redis caches for GeoJSON, digital twins, and searches invalidated.',
        );
      }

      logger.log('Report Generated');
      return report;
    } catch (err) {
      logger.error(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      context.errors.push({
        file: 'archive',
        message: err instanceof Error ? err.message : String(err),
        severity: 'CRITICAL',
      });

      const report = this.generateReportJson(
        context,
        ImportSessionStatus.FAILED,
      );
      if (!dryRun) {
        await this.sessionService.addErrors(sessionId, context.errors);
      }
      await this.sessionService.completeSession(
        sessionId,
        ImportSessionStatus.FAILED,
        stats,
        context.errors.length,
        0,
        report,
      );
      return report;
    } finally {
      // Clean up extracted files
      this.cleanupFolder(extractedDir);
    }
  }

  private generateReportJson(
    context: PipelineContext,
    status: ImportSessionStatus,
  ) {
    const counts: Record<string, any> = {};
    Object.entries(context.stats).forEach(([entity, stat]) => {
      counts[entity] = {
        processed: stat.processed,
        inserted: stat.inserted,
        updated: stat.updated,
        skipped: stat.skipped,
      };
    });

    return {
      sessionId: context.sessionId,
      status,
      dryRun: context.dryRun,
      duration: 0, // Filled in database complete stage
      counts,
      warnings: context.errors
        .filter((e) => e.severity === 'WARNING')
        .map((w) => w.message),
      errors: context.errors
        .filter((e) => e.severity === 'ERROR' || e.severity === 'CRITICAL')
        .map((e) => e.message),
    };
  }

  private cleanupFolder(folderPath: string) {
    try {
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
    } catch {
      this.nestLogger.warn(
        `Failed to clean up temp extraction folder: ${folderPath}`,
      );
    }
  }
}
