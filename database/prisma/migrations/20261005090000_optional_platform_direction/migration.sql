ALTER TABLE "platforms"
ALTER COLUMN "towardsStationId" DROP NOT NULL;

ALTER TABLE "platforms"
ALTER COLUMN "screenDoors" DROP NOT NULL,
ALTER COLUMN "screenDoors" DROP DEFAULT,
ALTER COLUMN "wheelchairBoarding" DROP NOT NULL,
ALTER COLUMN "wheelchairBoarding" DROP DEFAULT;
