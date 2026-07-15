import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';

// Controllers
import { IngestionController } from './controllers/ingestion.controller';

// Services
import { IngestionService } from './services/ingestion.service';
import { ArchiveService } from './services/archive.service';
import { CsvReaderService } from './services/csv-reader.service';
import { ImportSessionService } from './services/import-session.service';

// Importer
import { TransitImporter } from './importers/transit.importer';

// Validators
import { GtfsArchiveValidator } from './validators/gtfs-archive.validator';

// Parsers
import { AgencyParser } from './parsers/agency.parser';
import { StopsParser } from './parsers/stops.parser';
import { RoutesParser } from './parsers/routes.parser';
import { CalendarParser } from './parsers/calendar.parser';
import { CalendarDatesParser } from './parsers/calendar-dates.parser';
import { ShapesParser } from './parsers/shapes.parser';
import { TripsParser } from './parsers/trips.parser';
import { StopTimesParser } from './parsers/stop-times.parser';
import { FrequenciesParser } from './parsers/frequencies.parser';

// Normalizers
import { AgencyNormalizer } from './normalizers/agency.normalizer';
import { StationNormalizer } from './normalizers/station.normalizer';
import { LineNormalizer } from './normalizers/line.normalizer';
import { TripNormalizer } from './normalizers/trip.normalizer';
import { StopTimesNormalizer } from './normalizers/stop-times.normalizer';
import { CalendarNormalizer } from './normalizers/calendar.normalizer';
import { CalendarDatesNormalizer } from './normalizers/calendar-dates.normalizer';
import { ShapesNormalizer } from './normalizers/shapes.normalizer';
import { FrequenciesNormalizer } from './normalizers/frequencies.normalizer';

// Transformers
import { AgencyTransformer } from './transformers/agency.transformer';
import { StationTransformer } from './transformers/station.transformer';
import { LineTransformer } from './transformers/line.transformer';
import { TripTransformer } from './transformers/trip.transformer';
import { StopTimesTransformer } from './transformers/stop-times.transformer';
import { CalendarTransformer } from './transformers/calendar.transformer';
import { CalendarDatesTransformer } from './transformers/calendar-dates.transformer';
import { ShapesTransformer } from './transformers/shapes.transformer';
import { FrequenciesTransformer } from './transformers/frequencies.transformer';

@Module({
  imports: [DatabaseModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    ArchiveService,
    CsvReaderService,
    ImportSessionService,
    TransitImporter,
    GtfsArchiveValidator,

    // Parsers
    AgencyParser,
    StopsParser,
    RoutesParser,
    CalendarParser,
    CalendarDatesParser,
    ShapesParser,
    TripsParser,
    StopTimesParser,
    FrequenciesParser,

    // Normalizers
    AgencyNormalizer,
    StationNormalizer,
    LineNormalizer,
    TripNormalizer,
    StopTimesNormalizer,
    CalendarNormalizer,
    CalendarDatesNormalizer,
    ShapesNormalizer,
    FrequenciesNormalizer,

    // Transformers
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
  exports: [IngestionService],
})
export class IngestionModule {}
