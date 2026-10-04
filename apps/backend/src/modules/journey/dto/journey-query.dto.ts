import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  Max,
  Min,
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

  @ApiPropertyOptional({
    description: 'Avoid line transfers (direct routes only)',
  })
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
    description: 'Number of candidate routes to return (1–10). Default: 5.',
    default: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  k?: number;

  @ApiPropertyOptional({
    description: 'Optional routing constraints',
    type: JourneyOptionsDto,
  })
  @IsOptional()
  @Type(() => JourneyOptionsDto)
  options?: JourneyOptionsDto;

  @ApiPropertyOptional({ description: 'Passenger mobility: STANDARD | REDUCED', enum: ['STANDARD', 'REDUCED'] })
  @IsOptional()
  @IsString()
  mobility?: 'STANDARD' | 'REDUCED';

  @ApiPropertyOptional({ description: 'Luggage profile: NONE | LIGHT | HEAVY', enum: ['NONE', 'LIGHT', 'HEAVY'] })
  @IsOptional()
  @IsString()
  luggage?: 'NONE' | 'LIGHT' | 'HEAVY';

  @ApiPropertyOptional({ description: 'Optimization objective: MIN_TRAVEL_TIME | MIN_FRICTION | BALANCED' })
  @IsOptional()
  @IsString()
  objective?: 'MIN_TRAVEL_TIME' | 'MIN_FRICTION' | 'BALANCED';

  @ApiPropertyOptional({ description: 'List of physical friction elements to avoid', type: [String] })
  @IsOptional()
  avoid?: string | string[];

  @ApiPropertyOptional({ description: 'List of transit preferences', type: [String] })
  @IsOptional()
  prefer?: string | string[];
}
