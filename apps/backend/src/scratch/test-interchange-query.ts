import { DatabaseService } from '../database/database.service';

const db = new DatabaseService();

async function main() {
  await db.$connect();

  const id = 'dffbe5ee-6503-4c85-a645-0043514a962e'; // Durgabai Deshmukh South Campus

  console.log(
    'Testing nearby interchanges query for Durgabai Deshmukh South Campus...',
  );
  const nearbyInterchanges = await db.$queryRawUnsafe<
    {
      id: string;
      name: string;
      lineId: string;
      lineCode: string;
      lineName: string;
      lineColor: string | null;
      distMeters: number;
    }[]
  >(
    `SELECT DISTINCT s2.id, s2.name, l.id as "lineId", l.code as "lineCode", l.name as "lineName", l.color as "lineColor",
            ROUND(ST_DistanceSphere(ST_MakePoint(s1.longitude, s1.latitude), ST_MakePoint(s2.longitude, s2.latitude))::numeric, 0)::int as "distMeters"
     FROM stations s1
     JOIN stations s2 ON s1.id != s2.id AND s1."systemId" = s2."systemId"
     JOIN stop_times st ON st."stationId" = s2.id
     JOIN trips t ON t.id = st."tripId"
     JOIN lines l ON l.id = t."lineId"
     WHERE s1.id = $1::uuid
       AND s2."isActive" = true
       AND l."isActive" = true
       AND ST_DistanceSphere(ST_MakePoint(s1.longitude, s1.latitude), ST_MakePoint(s2.longitude, s2.latitude)) <= 1000
     ORDER BY "distMeters" ASC`,
    id,
  );

  console.log('Query result:', nearbyInterchanges);
}

void main().finally(() => db.$disconnect());
