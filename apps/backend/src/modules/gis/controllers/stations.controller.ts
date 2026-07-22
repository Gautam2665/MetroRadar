import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { DigitalTwinService } from '../services/digital-twin.service';
import { RedisService } from '../../../redis/redis.service';

@ApiTags('stations')
@Controller('stations')
export class StationsController {
  constructor(
    private readonly digitalTwinService: DigitalTwinService,
    private readonly redisService: RedisService,
  ) {}

  @Get(':id/digital-twin')
  @ApiOperation({
    summary:
      'Get composite Station Digital Twin metadata, physical layout, amenities, and commercial outlets',
  })
  @ApiParam({ name: 'id', type: String, description: 'Station UUID' })
  async getDigitalTwin(@Param('id') id: string): Promise<unknown> {
    const cacheKey = `digitaltwin:station:${id}`;
    const cached =
      await this.redisService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const result = await this.digitalTwinService.getStationDigitalTwin(id);
    await this.redisService.set(cacheKey, result, 3600);
    return result;
  }
}
