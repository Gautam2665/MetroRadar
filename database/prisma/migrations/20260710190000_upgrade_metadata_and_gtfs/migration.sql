-- CreateEnum
CREATE TYPE "ImportSessionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportErrorSeverity" AS ENUM ('WARNING', 'ERROR', 'CRITICAL');

-- AlterTable
ALTER TABLE "systems" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "agencies" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "asset_owners" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "lines" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "stations" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "station_sequences" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "levels" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "platforms" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "interchanges" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "entrances" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "amenities" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "commercial_spaces" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "commercial_outlets" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

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

-- Create GIST spatial index on shapes table
CREATE INDEX IF NOT EXISTS shapes_geom_gist_idx ON "shapes" USING GIST ("geom");

-- Bind geometry sync trigger to shapes
DROP TRIGGER IF EXISTS shapes_geom_sync_trigger ON "shapes";
CREATE TRIGGER shapes_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "shapes"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();


