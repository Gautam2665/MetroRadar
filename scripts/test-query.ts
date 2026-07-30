import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const raw = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      l.id, l.code, l.name, l.color, s."shapeId",
      json_build_object(
        'type', 'Feature',
        'geometry', json_build_object(
          'type', 'LineString',
          'coordinates', (
             SELECT json_agg(json_build_array(sh.longitude, sh.latitude) ORDER BY sh.sequence)
             FROM shapes sh
             WHERE sh."shapeId" = s."shapeId" AND sh."systemId" = l."systemId"
          )
        ),
        'properties', json_build_object(
          'id', l.id,
          'code', l.code,
          'name', l.name,
          'color', COALESCE(l.color, ''),
          'systemId', l."systemId"
        )
      ) as feature
    FROM lines l
    JOIN (
      SELECT DISTINCT "lineId", "shapeId"
      FROM trips
      WHERE "shapeId" IS NOT NULL
    ) s ON s."lineId" = l.id
    WHERE l."isActive" = true;
  `);

  console.log('Lines GeoJSON raw count:', raw.length);
  if (raw.length > 0) {
    console.log('Sample feature properties:', raw[0].feature.properties);
    console.log('Sample feature coords count:', raw[0].feature.geometry.coordinates?.length);
  }
}

main().finally(() => prisma.$disconnect());
