import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_JOB_OPTIONS } from './queue.constants';

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
  ],
  exports: [BullModule],
})
export class QueueModule {}
