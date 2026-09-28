import { Module } from '@nestjs/common';
import { MerchantsModule } from '../merchants/merchants.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ConversionAttributionModule } from '../conversion-attribution/conversion-attribution.module';
import { OfferSideEffectsService } from './offer-side-effects.service';

@Module({
  imports: [MerchantsModule, ActivityLogModule, ConversionAttributionModule],
  providers: [OfferSideEffectsService],
  exports: [OfferSideEffectsService],
})
export class OfferSideEffectsModule {}
