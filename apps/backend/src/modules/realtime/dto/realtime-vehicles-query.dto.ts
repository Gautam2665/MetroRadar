import { IsOptional, IsString } from 'class-validator';

export class RealtimeVehiclesQueryDto {
  @IsOptional()
  @IsString()
  system?: string;

  @IsOptional()
  @IsString()
  line?: string;
}
