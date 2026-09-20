import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { MerchantProfileService } from './merchant-profile.service';
import { MerchantsService } from './merchants.service';

@Module({
  imports: [DrizzleModule],
  providers: [MerchantsService, MerchantProfileService],
  exports: [MerchantsService, MerchantProfileService],
})
export class MerchantsModule {}
