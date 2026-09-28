import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { QUEUES } from '../../queue/queue.constants';
import { MerchantsModule } from '../merchants/merchants.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ConversionAttributionModule } from '../conversion-attribution/conversion-attribution.module';
import { EventLoggerService } from './event-logger.service';
import { WebhookProcessor } from './webhook.processor';
import { WebhookQueueService } from './webhook-queue.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    DrizzleModule,
    MerchantsModule,
    ActivityLogModule,
    ConversionAttributionModule,
    BullModule.registerQueue({ name: QUEUES.WEBHOOKS }),
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    EventLoggerService,
    WebhookQueueService,
    WebhookProcessor,
  ],
})
export class WebhooksModule {}
