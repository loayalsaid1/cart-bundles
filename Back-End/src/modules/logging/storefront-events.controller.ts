import { InjectQueue } from '@nestjs/bullmq';
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Queue } from 'bullmq';
import { IsPublic } from '../../common/decorators';
import { QUEUES } from '../../queue/queue.constants';
import { RedisService } from '../../redis/redis.service';
import { StorefrontEventDto } from './dto/storefront-event.dto';
import type { StorefrontEventJob } from './types/activity.types';

const RATE_WINDOW_SECONDS = 10;
const RATE_MAX_PER_WINDOW = 40;

@IsPublic()
@Controller('storefront/events')
export class StorefrontEventsController {
  constructor(
    @InjectQueue(QUEUES.STOREFRONT)
    private readonly queue: Queue<StorefrontEventJob>,
    private readonly redis: RedisService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async ingest(
    @Body() dto: StorefrontEventDto,
    @Req() req: Request,
  ): Promise<{ status: string }> {
    const clientId = this.resolveClientId(req);
    const rateKey = `rate:storefront:${clientId}:${dto.merchantId}:${dto.offerId}:${dto.event}`;
    const count = await this.redis.incr(rateKey, RATE_WINDOW_SECONDS);
    if (count > RATE_MAX_PER_WINDOW) {
      throw new HttpException(
        { status: 'throttled' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.queue.add(dto.event, dto);
    return { status: 'accepted' };
  }

  private resolveClientId(req: Request): string {
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
