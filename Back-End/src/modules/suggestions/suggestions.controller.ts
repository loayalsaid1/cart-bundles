import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators';
import type { EmbedContext } from '../auth/types/embed-context.interface';
import { SuggestionsService } from './suggestions.service';

class CreateSuggestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body: string;
}

@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get()
  list(@CurrentUser('merchantId') merchantId: number) {
    return this.suggestionsService.listForMerchant(merchantId);
  }

  @Post()
  create(
    @CurrentUser() user: EmbedContext,
    @Body() dto: CreateSuggestionDto,
  ) {
    return this.suggestionsService.create(user.merchantId, user.userId, dto);
  }
}
