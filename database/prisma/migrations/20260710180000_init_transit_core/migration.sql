-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

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
    "geom" geometry,
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

    CONSTRAINT "interchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrances" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geom" geometry,
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
    "geom" geometry,
    "status" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

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
    "geom" geometry,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

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

    CONSTRAINT "commercial_outlets_pkey" PRIMARY KEY ("id")
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

-- Create GIST spatial indexes on Unsupported geometry columns
CREATE INDEX IF NOT EXISTS stations_geom_gist_idx ON "stations" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS entrances_geom_gist_idx ON "entrances" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS amenities_geom_gist_idx ON "amenities" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS commercial_spaces_geom_gist_idx ON "commercial_spaces" USING GIST ("geom");

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
CREATE OR REPLACE TRIGGER stations_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "stations"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();

-- Bind trigger to entrances
CREATE OR REPLACE TRIGGER entrances_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "entrances"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();

-- Bind trigger to amenities
CREATE OR REPLACE TRIGGER amenities_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "amenities"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();

-- Bind trigger to commercial_spaces
CREATE OR REPLACE TRIGGER commercial_spaces_geom_sync_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "commercial_spaces"
FOR EACH ROW
EXECUTE FUNCTION update_geom_from_lat_lon();
