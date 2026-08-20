import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { EventLoggerService } from './event-logger.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [DrizzleModule, MerchantsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, EventLoggerService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
