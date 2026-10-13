import { Test, TestingModule } from '@nestjs/testing';
import { StationResolverService } from '../services/station-resolver.service';
import { DatabaseService } from '../../../database/database.service';
import { SearchService } from '../../gis/services/search.service';

describe('StationResolverService', () => {
  let service: StationResolverService;

  const mockStations = [
    {
      id: 'stn-gundavali-1',
      code: 'GUND',
      name: 'Gundavali',
      city: 'mumbai',
      latitude: 19.117,
      longitude: 72.856,
      isActive: true,
    },
    {
      id: 'stn-andheri-1',
      code: 'ANDH',
      name: 'Andheri',
      city: 'mumbai',
      latitude: 19.119,
      longitude: 72.846,
      isActive: true,
    },
    {
      id: 'stn-weh-1',
      code: 'WEH',
      name: 'Western Express Highway',
      city: 'mumbai',
      latitude: 19.116,
      longitude: 72.855,
      isActive: true,
    },
    {
      id: 'stn-bkc-1',
      code: 'BKC',
      name: 'Bandra Kurla Complex',
      city: 'mumbai',
      latitude: 19.065,
      longitude: 72.868,
      isActive: true,
    },
  ];

  const mockPrisma = {
    station: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = mockStations.find((s) => s.id === where.id);
        return Promise.resolve(found || null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.OR) {
          for (const cond of where.OR) {
            const query = cond.name?.equals || cond.code?.equals;
            if (query) {
              const match = mockStations.find(
                (s) =>
                  s.name.toLowerCase() === query.toLowerCase() ||
                  s.code.toLowerCase() === query.toLowerCase(),
              );
              if (match) return Promise.resolve(match);
            }
          }
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        if (where?.OR) {
          const sub = where.OR[0]?.name?.contains?.toLowerCase();
          if (sub) {
            return Promise.resolve(
              mockStations.filter(
                (s) =>
                  s.name.toLowerCase().includes(sub) ||
                  s.code.toLowerCase().includes(sub),
              ),
            );
          }
        }
        return Promise.resolve(mockStations);
      }),
    },
  };

  const mockSearchService = {
    search: jest.fn().mockResolvedValue({ features: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StationResolverService,
        {
          provide: DatabaseService,
          useValue: mockPrisma,
        },
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    service = module.get<StationResolverService>(StationResolverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should resolve exact station name', async () => {
    const resolved = await service.resolveStation('Gundavali');
    expect(resolved).not.toBeNull();
    expect(resolved?.id).toBe('stn-gundavali-1');
    expect(resolved?.name).toBe('Gundavali');
  });

  it('should resolve colloquial acronym "WEH" to Western Express Highway', async () => {
    const resolved = await service.resolveStation('WEH');
    expect(resolved).not.toBeNull();
    expect(resolved?.name).toBe('Western Express Highway');
  });

  it('should resolve colloquial "bkc" to Bandra Kurla Complex', async () => {
    const resolved = await service.resolveStation('BKC');
    expect(resolved).not.toBeNull();
    expect(resolved?.name).toBe('Bandra Kurla Complex');
  });

  it('should strip "metro" and match "Gundavali metro station"', async () => {
    const resolved = await service.resolveStation('Gundavali metro station');
    expect(resolved).not.toBeNull();
    expect(resolved?.name).toBe('Gundavali');
  });
});
