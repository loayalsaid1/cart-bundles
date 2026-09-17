import { InjectQueue } from '@nestjs/bullmq';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { IsPublic, RateLimit } from '../../common/decorators';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { QUEUES } from '../../queue/queue.constants';
import { StorefrontEventDto } from './dto/storefront-event.dto';
import type { StorefrontEventJob } from './types/activity.types';

@IsPublic()
@Controller('storefront/events')
export class StorefrontEventsController {
  constructor(
    @InjectQueue(QUEUES.STOREFRONT)
    private readonly queue: Queue<StorefrontEventJob>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit({ window: 10, max: 40 })
  @UseGuards(RateLimitGuard)
  async ingest(
    @Body() dto: StorefrontEventDto,
  ): Promise<{ status: string }> {
    await this.queue.add(dto.event, dto);
    return { status: 'accepted' };
  }
}
