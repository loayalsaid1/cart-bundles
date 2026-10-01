import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { MerchantProfileService } from './merchant-profile.service';
import { MerchantsService } from './merchants.service';

@Module({
  imports: [DrizzleModule, ActivityLogModule],
  providers: [MerchantsService, MerchantProfileService],
  exports: [MerchantsService, MerchantProfileService],
})
export class MerchantsModule {}
