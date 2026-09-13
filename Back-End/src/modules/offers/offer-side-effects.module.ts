import { Module } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { OfferSideEffectsService } from './offer-side-effects.service';

@Module({
  imports: [MerchantsModule, LoggingModule],
  providers: [OfferSideEffectsService],
  exports: [OfferSideEffectsService],
})
export class OfferSideEffectsModule {}
