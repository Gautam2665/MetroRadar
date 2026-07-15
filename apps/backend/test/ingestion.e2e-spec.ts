/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Ingestion Controller (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;
  let systemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<DatabaseService>(DatabaseService);

    // Cleanup first to avoid conflict from past runs
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "commercial_outlets", "commercial_spaces", "amenities", "entrances", "interchanges", "platforms", "levels", "station_sequences", "stop_times", "trips", "frequencies", "walking_edges", "shapes", "calendar_dates", "calendars", "lines", "stations", "agencies", "asset_owners", "import_audits", "import_errors", "import_sessions", "systems" CASCADE;'
    );

    // Ensure we have a system in place to ingest into
    const system = await prisma.system.create({
      data: {
        code: 'MUMBAI_METRO',
        name: 'Mumbai Metro',
        city: 'Mumbai',
        country: 'India',
        timezone: 'Asia/Kolkata',
        status: 'ACTIVE',
      },
    });
    systemId = system.id;
  });

  afterAll(async () => {
    // Cleanup imported data to keep DB clean
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "commercial_outlets", "commercial_spaces", "amenities", "entrances", "interchanges", "platforms", "levels", "station_sequences", "stop_times", "trips", "frequencies", "walking_edges", "shapes", "calendar_dates", "calendars", "lines", "stations", "agencies", "asset_owners", "import_audits", "import_errors", "import_sessions", "systems" CASCADE;'
    );
    await app.close();
  });

  it('should run a dry run successfully without writing to the database', async () => {
    const zipPath = path.join(__dirname, '../../../sample-data/mumbai/mumbai-metro-gtfs.zip');
    const zipBuffer = fs.readFileSync(zipPath);

    const response = await request(app.getHttpServer())
      .post(`/ingestion/gtfs?systemId=${systemId}&dryRun=true`)
      .attach('file', zipBuffer, 'mumbai-metro-gtfs.zip')
      .expect(201);

    expect(response.body.status).toBe('SUCCESS');
    expect(response.body.dryRun).toBe(true);

    // Verify database remains empty for these tables
    const agenciesCount = await prisma.agency.count();
    const stationsCount = await prisma.station.count();
    expect(agenciesCount).toBe(0);
    expect(stationsCount).toBe(0);
  });

  it('should ingest sample GTFS zip file successfully', async () => {
    const zipPath = path.join(__dirname, '../../../sample-data/mumbai/mumbai-metro-gtfs.zip');
    const zipBuffer = fs.readFileSync(zipPath);

    const response = await request(app.getHttpServer())
      .post(`/ingestion/gtfs?systemId=${systemId}`)
      .attach('file', zipBuffer, 'mumbai-metro-gtfs.zip')
      .expect(201);

    expect(response.body.status).toBe('SUCCESS');
    expect(response.body.dryRun).toBe(false);

    // Check database entries
    const agencies = await prisma.agency.findMany();
    const stations = await prisma.station.findMany();
    const lines = await prisma.line.findMany();
    const trips = await prisma.trip.findMany();
    const stopTimes = await prisma.stopTime.findMany();

    expect(agencies).toHaveLength(1);
    expect(agencies[0].name).toContain('Maha Mumbai Metro');
    expect(stations).toHaveLength(2); // ST_DAHE and ST_KNDP
    expect(lines).toHaveLength(1); // L2A
    expect(trips).toHaveLength(1); // T_L2A_01
    expect(stopTimes).toHaveLength(2);
  });

  it('should be idempotent and update rather than duplicate on second import', async () => {
    const zipPath = path.join(__dirname, '../../../sample-data/mumbai/mumbai-metro-gtfs.zip');
    const zipBuffer = fs.readFileSync(zipPath);

    const response = await request(app.getHttpServer())
      .post(`/ingestion/gtfs?systemId=${systemId}`)
      .attach('file', zipBuffer, 'mumbai-metro-gtfs.zip')
      .expect(201);

    expect(response.body.status).toBe('SUCCESS');

    // Counts should remain exactly the same as the first import
    const agencies = await prisma.agency.findMany();
    const stations = await prisma.station.findMany();
    const lines = await prisma.line.findMany();

    expect(agencies).toHaveLength(1);
    expect(stations).toHaveLength(2);
    expect(lines).toHaveLength(1);
  });
});
