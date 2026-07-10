import { Test, TestingModule } from '@nestjs/testing';
import { GtfsService } from './gtfs.service';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs';
import * as path from 'path';

describe('GtfsService', () => {
  let service: GtfsService;

  const mockPrisma = {
    system: {
      findUnique: jest.fn(),
    },
    agency: {
      upsert: jest.fn(),
    },
    station: {
      upsert: jest.fn(),
    },
    level: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    line: {
      upsert: jest.fn(),
    },
    calendar: {
      upsert: jest.fn(),
    },
    calendarDate: {
      createMany: jest.fn(),
    },
    shape: {
      createMany: jest.fn(),
    },
    trip: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    stopTime: {
      createMany: jest.fn(),
    },
    frequency: {
      createMany: jest.fn(),
    },
    assetOwner: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GtfsService,
        {
          provide: DatabaseService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<GtfsService>(GtfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseCsvFile', () => {
    const testDir = path.join(__dirname, 'test_gtfs_temp');
    const testFile = path.join(testDir, 'agency.txt');

    beforeAll(() => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      fs.writeFileSync(
        testFile,
        'agency_id,agency_name,agency_url,agency_timezone\n' +
          'MMMOCL,Maha Mumbai Metro operation,https://mmmocl.co.in,Asia/Kolkata\n',
      );
    });

    afterAll(() => {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir);
      }
    });

    it('should parse CSV lines correctly', async () => {
      const rows: Record<string, string>[] = [];
      await service.parseCsvFile(testFile, async (row: Record<string, string>) => {
        rows.push(row);
        await Promise.resolve();
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]['agency_id']).toBe('MMMOCL');
      expect(rows[0]['agency_name']).toBe('Maha Mumbai Metro operation');
      expect(rows[0]['agency_url']).toBe('https://mmmocl.co.in');
    });
  });
});
