-- Levels are line-owned at shared interchange stations. Keep the column
-- nullable for legacy physical levels until they have an evidence-backed
-- corridor assignment.
ALTER TABLE "levels"
ADD COLUMN "lineId" UUID;

ALTER TABLE "levels"
ADD COLUMN "evidenceStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "sourceId" TEXT;

CREATE INDEX "levels_lineId_idx" ON "levels"("lineId");

ALTER TABLE "levels"
ADD CONSTRAINT "levels_lineId_fkey"
FOREIGN KEY ("lineId") REFERENCES "lines"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "platforms"
ADD COLUMN "evidenceStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "sourceId" TEXT;

-- Assign an existing level only when its active platforms all reference one
-- corridor, or when it has no platforms and the station serves one corridor.
-- Shared or ambiguous legacy levels stay unassigned.
WITH platform_owners AS (
  SELECT lvl."id" AS "levelId", MIN(pf."lineId"::text)::uuid AS "lineId"
  FROM "levels" lvl
  JOIN "platforms" pf ON pf."levelId" = lvl."id" AND pf."isActive" = true
  WHERE lvl."lineId" IS NULL
  GROUP BY lvl."id"
  HAVING COUNT(DISTINCT pf."lineId") = 1
), sequence_owners AS (
  SELECT lvl."id" AS "levelId", MIN(ss."lineId"::text)::uuid AS "lineId"
  FROM "levels" lvl
  JOIN "station_sequences" ss ON ss."stationId" = lvl."stationId" AND ss."isActive" = true
  WHERE lvl."lineId" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "platforms" pf WHERE pf."levelId" = lvl."id" AND pf."isActive" = true)
  GROUP BY lvl."id"
  HAVING COUNT(DISTINCT ss."lineId") = 1
), unambiguous_owners AS (
  SELECT * FROM platform_owners
  UNION ALL
  SELECT * FROM sequence_owners
)
UPDATE "levels" lvl
SET "lineId" = owners."lineId"
FROM unambiguous_owners owners
WHERE lvl."id" = owners."levelId" AND lvl."lineId" IS NULL;
