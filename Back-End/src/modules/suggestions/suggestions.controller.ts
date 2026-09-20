import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser, requireMerchantId } from '../../common/decorators';
import type { EmbedContext } from '../auth/types/embed-context.interface';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { SuggestionsService } from './suggestions.service';

@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get()
  list(@CurrentUser('merchantId') merchantId: number) {
    return this.suggestionsService.listForMerchant(merchantId);
  }

  @Post()
  create(@CurrentUser() user: EmbedContext, @Body() dto: CreateSuggestionDto) {
    return this.suggestionsService.create(
      requireMerchantId(user),
      user.userId,
      dto,
    );
  }
}
