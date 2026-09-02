import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { MerchantsService } from './merchants.service';

@Module({
  imports: [DrizzleModule],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
