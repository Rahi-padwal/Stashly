import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class SearchLinksDto {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}