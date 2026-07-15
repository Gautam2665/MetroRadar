import { Test, TestingModule } from '@nestjs/testing';
import { StationNormalizer } from './station.normalizer';
import { PipelineContext } from '../interfaces/pipeline-context.interface';
import { GtfsStopRow } from '../types/gtfs.types';

describe('StationNormalizer', () => {
  let normalizer: StationNormalizer;
  let mockContext: PipelineContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StationNormalizer],
    }).compile();

    normalizer = module.get<StationNormalizer>(StationNormalizer);

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

  it('should normalize valid stops', () => {
    const rows: GtfsStopRow[] = [
      {
        stop_id: 'BVI',
        stop_name: ' Borivali ',
        stop_lat: ' 19.2290 ',
        stop_lon: ' 72.8573 ',
        location_type: ' 1 ',
      },
    ];

    const result = normalizer.normalize(mockContext, rows);
    expect(result).toHaveLength(1);
    expect(result[0].stop_id).toBe('BVI');
    expect(result[0].stop_name).toBe('Borivali');
    expect(result[0].stop_lat).toBe('19.229');
    expect(result[0].stop_lon).toBe('72.8573');
    expect(mockContext.errors).toHaveLength(0);
  });

  it('should report error for invalid coordinates', () => {
    const rows: GtfsStopRow[] = [
      {
        stop_id: 'BVI',
        stop_name: 'Borivali',
        stop_lat: 'abc',
        stop_lon: '72.8573',
        location_type: '1',
      },
      {
        stop_id: 'DHR',
        stop_name: 'Dahisar',
        stop_lat: '95.0',
        stop_lon: '72.8573',
        location_type: '1',
      },
    ];

    const result = normalizer.normalize(mockContext, rows);
    expect(result).toHaveLength(0);
    expect(mockContext.errors).toHaveLength(2);
    expect(mockContext.errors[0].message).toContain(
      'invalid coordinate floats',
    );
    expect(mockContext.errors[1].message).toContain(
      'coordinates out of bounds',
    );
  });
});
