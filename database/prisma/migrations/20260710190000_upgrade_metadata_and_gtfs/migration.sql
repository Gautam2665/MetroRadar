-- CreateEnum
CREATE TYPE "SystemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CONSTRUCTION', 'PLANNED');

-- CreateEnum
CREATE TYPE "LineStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'MAINTENANCE', 'PLANNED');

-- CreateEnum
CREATE TYPE "TractionType" AS ENUM ('THIRD_RAIL', 'OVERHEAD_CATENARY', 'DIESEL', 'OTHER');

-- CreateEnum
CREATE TYPE "SignallingType" AS ENUM ('CBTC', 'ATC', 'ATP', 'MANUAL');

-- CreateEnum
CREATE TYPE "LevelType" AS ENUM ('STREET', 'CONCOURSE', 'PLATFORM', 'BASEMENT', 'MEZZANINE', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatformStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'MAINTENANCE', 'PLANNED');

-- CreateEnum
CREATE TYPE "AmenityType" AS ENUM ('ATM', 'WASHROOM', 'POLICE', 'WATER', 'CHARGING', 'PRAYER', 'BABY_CARE', 'OTHER');

-- CreateEnum
CREATE TYPE "CommercialSpaceStatus" AS ENUM ('VACANT', 'OCCUPIED', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "ImportSessionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportErrorSeverity" AS ENUM ('WARNING', 'ERROR', 'CRITICAL');

-- DropTable
DROP TABLE "SystemStatus";

-- CreateTable
CREATE TABLE "systems" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "status" "SystemStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "contactEmail" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_owners" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "asset_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "agencyId" UUID NOT NULL,
    "assetOwnerId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "status" "LineStatus" NOT NULL DEFAULT 'ACTIVE',
    "traction" "TractionType" NOT NULL,
    "signalling" "SignallingType" NOT NULL,
    "gauge" TEXT,
    "length" DOUBLE PRECISION,
    "openingDate" DATE,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geom" geometry(Point, 4326),
    "timezone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT false,
    "parking" BOOLEAN NOT NULL DEFAULT false,
    "bikeParking" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_sequences" (
    "id" UUID NOT NULL,
    "lineId" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "distanceFromPrevious" DOUBLE PRECISION NOT NULL,
    "travelTimeFromPrevious" INTEGER NOT NULL,
    "nextStationId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "station_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "type" "LevelType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" UUID NOT NULL,
    "levelId" UUID NOT NULL,
    "lineId" UUID NOT NULL,
    "platformNumber" TEXT NOT NULL,
    "towardsStationId" UUID NOT NULL,
    "length" DOUBLE PRECISION,
    "screenDoors" BOOLEAN NOT NULL DEFAULT false,
    "wheelchairBoarding" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlatformStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interchanges" (
    "id" UUID NOT NULL,
    "fromPlatformId" UUID NOT NULL,
    "toPlatformId" UUID NOT NULL,
    "walkingDistance" DOUBLE PRECISION NOT NULL,
    "walkingTime" INTEGER NOT NULL,
    "accessible" BOOLEAN NOT NULL DEFAULT false,
    "verticalMovement" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "interchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrances" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geom" geometry(Point, 4326),
    "parking" BOOLEAN NOT NULL DEFAULT false,
    "lift" BOOLEAN NOT NULL DEFAULT false,
    "escalator" BOOLEAN NOT NULL DEFAULT false,
    "accessible" BOOLEAN NOT NULL DEFAULT false,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "entrances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "levelId" UUID NOT NULL,
    "type" "AmenityType" NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geom" geometry(Point, 4326),
    "status" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_spaces" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "levelId" UUID NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "area" DOUBLE PRECISION,
    "status" "CommercialSpaceStatus" NOT NULL DEFAULT 'VACANT',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geom" geometry(Point, 4326),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "commercial_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_outlets" (
    "id" UUID NOT NULL,
    "commercialSpaceId" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "averageVisitTime" INTEGER,
    "rating" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "commercial_outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "lineId" UUID NOT NULL,
    "serviceId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "tripHeadsign" TEXT,
    "directionId" INTEGER,
    "shapeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stop_times" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "stopSequence" INTEGER NOT NULL,
    "stopHeadsign" TEXT,
    "pickupType" INTEGER NOT NULL DEFAULT 0,
    "dropOffType" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "stop_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendars" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "serviceId" TEXT NOT NULL,
    "monday" BOOLEAN NOT NULL,
    "tuesday" BOOLEAN NOT NULL,
    "wednesday" BOOLEAN NOT NULL,
    "thursday" BOOLEAN NOT NULL,
    "friday" BOOLEAN NOT NULL,
    "saturday" BOOLEAN NOT NULL,
    "sunday" BOOLEAN NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_dates" (
    "id" UUID NOT NULL,
    "calendarId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "exceptionType" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "calendar_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shapes" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "shapeId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sequence" INTEGER NOT NULL,
    "distTraveled" DOUBLE PRECISION,
    "geom" geometry(Point, 4326),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "shapes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequencies" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "headwaySecs" INTEGER NOT NULL,
    "exactTimes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "frequencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walking_edges" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "fromLevelId" UUID,
    "fromPlatformId" UUID,
    "fromEntranceId" UUID,
    "toLevelId" UUID,
    "toPlatformId" UUID,
    "toEntranceId" UUID,
    "walkingDistance" DOUBLE PRECISION NOT NULL,
    "walkingTime" INTEGER NOT NULL,
    "accessible" BOOLEAN NOT NULL DEFAULT false,
    "verticalMovement" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "walking_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_sessions" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportSessionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ,
    "duration" INTEGER,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsInserted" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsDeleted" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "warningsCount" INTEGER NOT NULL DEFAULT 0,
    "report" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_errors" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "file" TEXT NOT NULL,
    "line" INTEGER,
    "message" TEXT NOT NULL,
    "severity" "ImportErrorSeverity" NOT NULL DEFAULT 'ERROR',
    "rawData" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_audits" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "import_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "systems_code_key" ON "systems"("code");

-- CreateIndex
CREATE INDEX "systems_name_idx" ON "systems"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_code_key" ON "agencies"("code");

-- CreateIndex
CREATE INDEX "agencies_name_idx" ON "agencies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "asset_owners_code_key" ON "asset_owners"("code");

-- CreateIndex
CREATE INDEX "asset_owners_name_idx" ON "asset_owners"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lines_code_key" ON "lines"("code");

-- CreateIndex
CREATE INDEX "lines_systemId_idx" ON "lines"("systemId");

-- CreateIndex
CREATE INDEX "lines_agencyId_idx" ON "lines"("agencyId");

-- CreateIndex
CREATE INDEX "lines_assetOwnerId_idx" ON "lines"("assetOwnerId");

-- CreateIndex
CREATE INDEX "lines_name_idx" ON "lines"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stations_code_key" ON "stations"("code");

-- CreateIndex
CREATE INDEX "stations_systemId_idx" ON "stations"("systemId");

-- CreateIndex
CREATE INDEX "stations_name_idx" ON "stations"("name");

-- CreateIndex
CREATE INDEX "station_sequences_lineId_idx" ON "station_sequences"("lineId");

-- CreateIndex
CREATE INDEX "station_sequences_stationId_idx" ON "station_sequences"("stationId");

-- CreateIndex
CREATE INDEX "station_sequences_nextStationId_idx" ON "station_sequences"("nextStationId");

-- CreateIndex
CREATE UNIQUE INDEX "station_sequences_lineId_sequence_key" ON "station_sequences"("lineId", "sequence");

-- CreateIndex
CREATE INDEX "levels_stationId_idx" ON "levels"("stationId");

-- CreateIndex
CREATE INDEX "levels_name_idx" ON "levels"("name");

-- CreateIndex
CREATE INDEX "platforms_levelId_idx" ON "platforms"("levelId");

-- CreateIndex
CREATE INDEX "platforms_lineId_idx" ON "platforms"("lineId");

-- CreateIndex
CREATE INDEX "platforms_towardsStationId_idx" ON "platforms"("towardsStationId");

-- CreateIndex
CREATE INDEX "interchanges_fromPlatformId_idx" ON "interchanges"("fromPlatformId");

-- CreateIndex
CREATE INDEX "interchanges_toPlatformId_idx" ON "interchanges"("toPlatformId");

-- CreateIndex
CREATE INDEX "entrances_stationId_idx" ON "entrances"("stationId");

-- CreateIndex
CREATE INDEX "entrances_name_idx" ON "entrances"("name");

-- CreateIndex
CREATE INDEX "amenities_stationId_idx" ON "amenities"("stationId");

-- CreateIndex
CREATE INDEX "amenities_levelId_idx" ON "amenities"("levelId");

-- CreateIndex
CREATE INDEX "amenities_name_idx" ON "amenities"("name");

-- CreateIndex
CREATE INDEX "commercial_spaces_stationId_idx" ON "commercial_spaces"("stationId");

-- CreateIndex
CREATE INDEX "commercial_spaces_levelId_idx" ON "commercial_spaces"("levelId");

-- CreateIndex
CREATE INDEX "commercial_spaces_unitNumber_idx" ON "commercial_spaces"("unitNumber");

-- CreateIndex
CREATE INDEX "commercial_outlets_commercialSpaceId_idx" ON "commercial_outlets"("commercialSpaceId");

-- CreateIndex
CREATE INDEX "commercial_outlets_brand_idx" ON "commercial_outlets"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "trips_tripId_key" ON "trips"("tripId");

-- CreateIndex
CREATE INDEX "trips_lineId_idx" ON "trips"("lineId");

-- CreateIndex
CREATE INDEX "trips_serviceId_idx" ON "trips"("serviceId");

-- CreateIndex
CREATE INDEX "trips_tripId_idx" ON "trips"("tripId");

-- CreateIndex
CREATE INDEX "trips_shapeId_idx" ON "trips"("shapeId");

-- CreateIndex
CREATE INDEX "stop_times_tripId_idx" ON "stop_times"("tripId");

-- CreateIndex
CREATE INDEX "stop_times_stationId_idx" ON "stop_times"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "stop_times_tripId_stopSequence_key" ON "stop_times"("tripId", "stopSequence");

-- CreateIndex
CREATE UNIQUE INDEX "calendars_serviceId_key" ON "calendars"("serviceId");

-- CreateIndex
CREATE INDEX "calendars_systemId_idx" ON "calendars"("systemId");

-- CreateIndex
CREATE INDEX "calendars_serviceId_idx" ON "calendars"("serviceId");

-- CreateIndex
CREATE INDEX "calendar_dates_calendarId_idx" ON "calendar_dates"("calendarId");

-- CreateIndex
CREATE INDEX "shapes_systemId_idx" ON "shapes"("systemId");

-- CreateIndex
CREATE INDEX "shapes_shapeId_idx" ON "shapes"("shapeId");

-- CreateIndex
CREATE UNIQUE INDEX "shapes_shapeId_sequence_key" ON "shapes"("shapeId", "sequence");

-- CreateIndex
CREATE INDEX "frequencies_tripId_idx" ON "frequencies"("tripId");

-- CreateIndex
CREATE INDEX "walking_edges_stationId_idx" ON "walking_edges"("stationId");

-- CreateIndex
CREATE INDEX "walking_edges_fromLevelId_idx" ON "walking_edges"("fromLevelId");

-- CreateIndex
CREATE INDEX "walking_edges_toLevelId_idx" ON "walking_edges"("toLevelId");

-- CreateIndex
CREATE INDEX "walking_edges_fromPlatformId_idx" ON "walking_edges"("fromPlatformId");

-- CreateIndex
CREATE INDEX "walking_edges_toPlatformId_idx" ON "walking_edges"("toPlatformId");

-- CreateIndex
CREATE INDEX "walking_edges_fromEntranceId_idx" ON "walking_edges"("fromEntranceId");

-- CreateIndex
CREATE INDEX "walking_edges_toEntranceId_idx" ON "walking_edges"("toEntranceId");

-- CreateIndex
CREATE INDEX "import_sessions_systemId_idx" ON "import_sessions"("systemId");

-- CreateIndex
CREATE INDEX "import_errors_sessionId_idx" ON "import_errors"("sessionId");

-- CreateIndex
CREATE INDEX "import_audits_sessionId_idx" ON "import_audits"("sessionId");

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_assetOwnerId_fkey" FOREIGN KEY ("assetOwnerId") REFERENCES "asset_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_sequences" ADD CONSTRAINT "station_sequences_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_sequences" ADD CONSTRAINT "station_sequences_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_sequences" ADD CONSTRAINT "station_sequences_nextStationId_fkey" FOREIGN KEY ("nextStationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "levels_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platforms" ADD CONSTRAINT "platforms_towardsStationId_fkey" FOREIGN KEY ("towardsStationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interchanges" ADD CONSTRAINT "interchanges_fromPlatformId_fkey" FOREIGN KEY ("fromPlatformId") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interchanges" ADD CONSTRAINT "interchanges_toPlatformId_fkey" FOREIGN KEY ("toPlatformId") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrances" ADD CONSTRAINT "entrances_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_spaces" ADD CONSTRAINT "commercial_spaces_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_spaces" ADD CONSTRAINT "commercial_spaces_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_outlets" ADD CONSTRAINT "commercial_outlets_commercialSpaceId_fkey" FOREIGN KEY ("commercialSpaceId") REFERENCES "commercial_spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "calendars"("serviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_dates" ADD CONSTRAINT "calendar_dates_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencies" ADD CONSTRAINT "frequencies_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walking_edges" ADD CONSTRAINT "walking_edges_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walking_edges" ADD CONSTRAINT "walking_edges_fromLevelId_fkey" FOREIGN KEY ("fromLevelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walking_edges" ADD CONSTRAINT "walking_edges_toLevelId_fkey" FOREIGN KEY ("toLevelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walking_edges" ADD CONSTRAINT "walking_edges_fromPlatformId_fkey" FOREIGN KEY ("fromPlatformId") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walking_edges" ADD CONSTRAINT "walking_edges_toPlatformId_fkey" FOREIGN KEY ("toPlatformId") REFERENCES "platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walking_edges" ADD CONSTRAINT "walking_edges_fromEntranceId_fkey" FOREIGN KEY ("fromEntranceId") REFERENCES "entrances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walking_edges" ADD CONSTRAINT "walking_edges_toEntranceId_fkey" FOREIGN KEY ("toEntranceId") REFERENCES "entrances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "import_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_audits" ADD CONSTRAINT "import_audits_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "import_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create GIST spatial indexes on Unsupported geometry columns
CREATE INDEX IF NOT EXISTS stations_geom_gist_idx ON "stations" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS entrances_geom_gist_idx ON "entrances" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS amenities_geom_gist_idx ON "amenities" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS commercial_spaces_geom_gist_idx ON "commercial_spaces" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS shapes_geom_gist_idx ON "shapes" USING GIST ("geom");

-- Create database trigger function to synchronize geometries from latitude and longitude automatically
CREATE OR REPLACE FUNCTION update_geom_from_lat_lon()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind trigger to stations
DROP TRIGGER IF EXISTS stations_geom_sync_trigger ON "stations";
CREATE TRIGGER stations_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "stations"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();

-- Bind trigger to entrances
DROP TRIGGER IF EXISTS entrances_geom_sync_trigger ON "entrances";
CREATE TRIGGER entrances_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "entrances"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();

-- Bind trigger to amenities
DROP TRIGGER IF EXISTS amenities_geom_sync_trigger ON "amenities";
CREATE TRIGGER amenities_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "amenities"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();

-- Bind trigger to commercial_spaces
DROP TRIGGER IF EXISTS commercial_spaces_geom_sync_trigger ON "commercial_spaces";
CREATE TRIGGER commercial_spaces_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "commercial_spaces"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();

-- Bind trigger to shapes
DROP TRIGGER IF EXISTS shapes_geom_sync_trigger ON "shapes";
CREATE TRIGGER shapes_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "shapes"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();


