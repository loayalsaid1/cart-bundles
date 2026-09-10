import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { LoggingModule } from '../logging/logging.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { EventLoggerService } from './event-logger.service';
import { WebhookStreamService } from './webhook-stream.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [DrizzleModule, MerchantsModule, LoggingModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, EventLoggerService, WebhookStreamService],
})
export class WebhooksModule {}
