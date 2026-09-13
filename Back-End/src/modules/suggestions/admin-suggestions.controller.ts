import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import {
  SuggestionsService,
  type SuggestionStatus,
} from './suggestions.service';

class UpdateSuggestionDto {
  @IsIn(['new', 'reviewed', 'planned', 'done', 'rejected'])
  status: SuggestionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}

@Roles([Role.Admin])
@Controller('admin/suggestions')
export class AdminSuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get()
  list(@Query('status') status?: SuggestionStatus) {
    return this.suggestionsService.listAll(status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSuggestionDto) {
    return this.suggestionsService.updateStatus(
      Number(id),
      dto.status,
      dto.adminNote,
    );
  }
}
