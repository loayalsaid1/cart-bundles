import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSuggestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body: string;
}
