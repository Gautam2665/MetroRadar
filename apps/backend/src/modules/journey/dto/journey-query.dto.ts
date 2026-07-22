import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

/**
 * Optional routing constraints — reserved for Sprint 6/7.
 * Sprint 5: all fields are parsed but not yet applied by the routing engine.
 * The DTO is intentionally extensible to avoid API redesign in future sprints.
 */
export class JourneyOptionsDto {
  @ApiPropertyOptional({ description: 'Avoid walking segments' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  avoidWalking?: boolean;

  @ApiPropertyOptional({ description: 'Avoid line transfers (direct routes only)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  avoidTransfers?: boolean;

  @ApiPropertyOptional({ description: 'Prefer wheelchair-accessible routes' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  wheelchair?: boolean;

  @ApiPropertyOptional({
    description: 'Restrict routing to specific line IDs (UUIDs)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLines?: string[];
}

/** Query parameters for GET /journeys */
export class JourneyQueryDto {
  @ApiProperty({ description: 'Origin station ID (UUID)', format: 'uuid' })
  @IsUUID()
  from!: string;

  @ApiProperty({ description: 'Destination station ID (UUID)', format: 'uuid' })
  @IsUUID()
  to!: string;

  @ApiPropertyOptional({
    description: 'Optional routing constraints',
    type: JourneyOptionsDto,
  })
  @IsOptional()
  @Type(() => JourneyOptionsDto)
  options?: JourneyOptionsDto;
}
