import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_JOB_OPTIONS, QUEUES } from './queue.constants';
import { QueueHealthService } from './queue-health.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUES.WEBHOOKS },
      { name: QUEUES.ACTIVITY },
      { name: QUEUES.STOREFRONT },
    ),
  ],
  providers: [QueueHealthService],
  exports: [BullModule, QueueHealthService],
})
export class QueueModule {}
