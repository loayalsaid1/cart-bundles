import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  SUGGESTION_STATUSES,
  type SuggestionStatus,
} from '../../../database/entities/suggestions';

export class UpdateSuggestionDto {
  @IsIn(SUGGESTION_STATUSES)
  status: SuggestionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
