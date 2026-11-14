import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RealtimeVehiclesQueryDto {
  @ApiPropertyOptional({
    description: 'Transit system code (default: MM for Mumbai Metro)',
    default: 'MM',
    example: 'MM',
  })
  @IsOptional()
  @IsString()
  system?: string;

  @ApiPropertyOptional({
    description: 'Filter by corridor / route code (e.g. LINE1, LINE2A, LINE7)',
    example: 'LINE1',
  })
  @IsOptional()
  @IsString()
  line?: string;
}
