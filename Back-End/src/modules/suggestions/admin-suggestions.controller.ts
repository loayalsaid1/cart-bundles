import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import {
  type SuggestionStatus,
  SuggestionsService,
} from './suggestions.service';

@Roles([Role.Admin])
@Controller('admin/suggestions')
export class AdminSuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get()
  list(@Query('status') status?: SuggestionStatus) {
    return this.suggestionsService.listAll(status);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSuggestionDto,
  ) {
    return this.suggestionsService.updateStatus(id, dto.status, dto.adminNote);
  }
}
