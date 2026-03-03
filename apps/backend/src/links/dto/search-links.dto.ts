import { IsString, MinLength } from 'class-validator';

export class SearchLinksDto {
  @IsString()
  @MinLength(1)
  q!: string;
}