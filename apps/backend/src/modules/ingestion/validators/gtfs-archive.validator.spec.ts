import { Test, TestingModule } from '@nestjs/testing';
import { GtfsArchiveValidator } from './gtfs-archive.validator';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import * as fs from 'fs';

jest.mock('fs');

describe('GtfsArchiveValidator', () => {
  let validator: GtfsArchiveValidator;
  let mockContext: PipelineContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GtfsArchiveValidator],
    }).compile();

    validator = module.get<GtfsArchiveValidator>(GtfsArchiveValidator);

    mockContext = {
      sessionId: 'test-session',
      systemId: 'test-system',
      dryRun: false,
      extractedDir: '/test/dir',
      errors: [],
      stats: {},
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };
  });

  it('should validate successfully when all required files exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const result = validator.validateArchive(mockContext);
    expect(result).toBe(true);
    expect(mockContext.errors).toHaveLength(0);
  });

  it('should fail validation when required files are missing', () => {
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('agency.txt')) return false;
      return true;
    });

    const result = validator.validateArchive(mockContext);
    expect(result).toBe(false);
    expect(mockContext.errors).toContainEqual(
      expect.objectContaining({
        message: 'Missing required file: agency.txt',
        severity: 'CRITICAL',
      }),
    );
  });

  it('should fail validation when neither calendar.txt nor calendar_dates.txt exist', () => {
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      if (
        filePath.endsWith('calendar.txt') ||
        filePath.endsWith('calendar_dates.txt')
      )
        return false;
      return true;
    });

    const result = validator.validateArchive(mockContext);
    expect(result).toBe(false);
    expect(mockContext.errors).toContainEqual(
      expect.objectContaining({
        message:
          'Must contain at least one of calendar.txt or calendar_dates.txt',
        severity: 'CRITICAL',
      }),
    );
  });
});
