/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { ArchiveService } from './archive.service';
import { ImportSessionService } from './import-session.service';
import { TransitImporter } from '../importers/transit.importer';
import { GtfsArchiveValidator } from '../validators/gtfs-archive.validator';
import * as fs from 'fs';

// Mock fs and other layers
jest.mock('fs');
jest.mock('./archive.service');
jest.mock('./import-session.service');
jest.mock('../importers/transit.importer');
jest.mock('../validators/gtfs-archive.validator');

// Mock all parsers, normalizers, and transformers
jest.mock('../parsers/agency.parser');
jest.mock('../parsers/stops.parser');
jest.mock('../parsers/routes.parser');
jest.mock('../parsers/calendar.parser');
jest.mock('../parsers/calendar-dates.parser');
jest.mock('../parsers/shapes.parser');
jest.mock('../parsers/trips.parser');
jest.mock('../parsers/stop-times.parser');
jest.mock('../parsers/frequencies.parser');

jest.mock('../normalizers/agency.normalizer');
jest.mock('../normalizers/station.normalizer');
jest.mock('../normalizers/line.normalizer');
jest.mock('../normalizers/trip.normalizer');
jest.mock('../normalizers/stop-times.normalizer');
jest.mock('../normalizers/calendar.normalizer');
jest.mock('../normalizers/calendar-dates.normalizer');
jest.mock('../normalizers/shapes.normalizer');
jest.mock('../normalizers/frequencies.normalizer');

jest.mock('../transformers/agency.transformer');
jest.mock('../transformers/station.transformer');
jest.mock('../transformers/line.transformer');
jest.mock('../transformers/trip.transformer');
jest.mock('../transformers/stop-times.transformer');
jest.mock('../transformers/calendar.transformer');
jest.mock('../transformers/calendar-dates.transformer');
jest.mock('../transformers/shapes.transformer');
jest.mock('../transformers/frequencies.transformer');

// Import mocked implementations
import { AgencyParser } from '../parsers/agency.parser';
import { StopsParser } from '../parsers/stops.parser';
import { RoutesParser } from '../parsers/routes.parser';
import { CalendarParser } from '../parsers/calendar.parser';
import { CalendarDatesParser } from '../parsers/calendar-dates.parser';
import { ShapesParser } from '../parsers/shapes.parser';
import { TripsParser } from '../parsers/trips.parser';
import { StopTimesParser } from '../parsers/stop-times.parser';
import { FrequenciesParser } from '../parsers/frequencies.parser';

import { AgencyNormalizer } from '../normalizers/agency.normalizer';
import { StationNormalizer } from '../normalizers/station.normalizer';
import { LineNormalizer } from '../normalizers/line.normalizer';
import { TripNormalizer } from '../normalizers/trip.normalizer';
import { StopTimesNormalizer } from '../normalizers/stop-times.normalizer';
import { CalendarNormalizer } from '../normalizers/calendar.normalizer';
import { CalendarDatesNormalizer } from '../normalizers/calendar-dates.normalizer';
import { ShapesNormalizer } from '../normalizers/shapes.normalizer';
import { FrequenciesNormalizer } from '../normalizers/frequencies.normalizer';

import { AgencyTransformer } from '../transformers/agency.transformer';
import { StationTransformer } from '../transformers/station.transformer';
import { LineTransformer } from '../transformers/line.transformer';
import { TripTransformer } from '../transformers/trip.transformer';
import { StopTimesTransformer } from '../transformers/stop-times.transformer';
import { CalendarTransformer } from '../transformers/calendar.transformer';
import { CalendarDatesTransformer } from '../transformers/calendar-dates.transformer';
import { ShapesTransformer } from '../transformers/shapes.transformer';
import { FrequenciesTransformer } from '../transformers/frequencies.transformer';

describe('IngestionService', () => {
  let service: IngestionService;
  let sessionService: ImportSessionService;
  let archiveValidator: GtfsArchiveValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        ArchiveService,
        ImportSessionService,
        TransitImporter,
        GtfsArchiveValidator,

        AgencyParser,
        StopsParser,
        RoutesParser,
        CalendarParser,
        CalendarDatesParser,
        ShapesParser,
        TripsParser,
        StopTimesParser,
        FrequenciesParser,

        AgencyNormalizer,
        StationNormalizer,
        LineNormalizer,
        TripNormalizer,
        StopTimesNormalizer,
        CalendarNormalizer,
        CalendarDatesNormalizer,
        ShapesNormalizer,
        FrequenciesNormalizer,

        AgencyTransformer,
        StationTransformer,
        LineTransformer,
        TripTransformer,
        StopTimesTransformer,
        CalendarTransformer,
        CalendarDatesTransformer,
        ShapesTransformer,
        FrequenciesTransformer,
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    sessionService = module.get<ImportSessionService>(ImportSessionService);
    archiveValidator = module.get<GtfsArchiveValidator>(GtfsArchiveValidator);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestGtfs', () => {
    const systemId = '39c9b54c-5fe3-455b-9d4f-d00db6cc141a';
    const fileBuffer = Buffer.from('test-zip-content');
    const filename = 'gtfs.zip';

    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(sessionService, 'createSession').mockResolvedValue({
        id: 'session-123',
        systemId,
        type: 'GTFS_STATIC',
        filename,
        status: 'RUNNING',
        startedAt: new Date(),
        finishedAt: null,
        duration: null,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        recordsSkipped: 0,
        errorsCount: 0,
        warningsCount: 0,
        report: null,
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    });

    it('should create an import session and log validation failure if validator returns false', async () => {
      jest.spyOn(archiveValidator, 'validateArchive').mockReturnValue(false);

      const result = await service.ingestGtfs(systemId, fileBuffer, filename);

      expect(result.status).toBe('FAILED');
      expect(result.errors).toContain(
        'GTFS archive structure validation failed.',
      );
      expect(sessionService.completeSession).toHaveBeenCalledWith(
        'session-123',
        'FAILED',
        expect.any(Object),
        expect.any(Number),
        0,
        expect.any(Object),
      );
    });

    it('should run successfully if validator returns true', async () => {
      jest.spyOn(archiveValidator, 'validateArchive').mockReturnValue(true);

      const result = await service.ingestGtfs(systemId, fileBuffer, filename);

      expect(result.status).toBe('SUCCESS');
      expect(result.errors).toHaveLength(0);
      expect(sessionService.completeSession).toHaveBeenCalledWith(
        'session-123',
        'SUCCESS',
        expect.any(Object),
        0,
        0,
        expect.any(Object),
      );
    });
  });
});
