import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Queue } from 'bullmq';
import { IsPublic } from '../../common/decorators';
import { DEFAULT_JOB_OPTIONS, QUEUES } from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import type { StorefrontEventName } from './activity.types';
import type { StorefrontEventJob } from './storefront-events.processor';

class StorefrontEventDto {
  @Type(() => Number)
  @IsInt()
  merchantId: number;

  @Type(() => Number)
  @IsInt()
  offerId: number;

  @IsIn([
    'offer.impression',
    'offer.click',
    'offer.add_to_cart',
    'offer.conversion',
  ])
  event: StorefrontEventName;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsString()
  source?: string;
}

@IsPublic()
@Controller('storefront/events')
export class StorefrontEventsController {
  constructor(
    @InjectQueue(QUEUES.STOREFRONT)
    private readonly queue: Queue<StorefrontEventJob>,
    private readonly redis: RedisService,
  ) {}

  @Post()
  async ingest(@Body() dto: StorefrontEventDto): Promise<{ status: string }> {
    const rateKey = `rate:storefront:${dto.merchantId}:${dto.offerId}:${dto.event}`;
    const count = await this.redis.incr(rateKey, 10);
    if (count > 40) {
      return { status: 'throttled' };
    }

    await this.queue.add(dto.event, dto, DEFAULT_JOB_OPTIONS);
    return { status: 'accepted' };
  }
}
