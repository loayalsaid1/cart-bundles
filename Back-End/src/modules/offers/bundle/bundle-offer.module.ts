import { Module } from '@nestjs/common';
import { BundleOfferController } from './bundle-offer.controller';
import { BundleOfferService } from './bundle-offer.service';
import { MerchantsModule } from '../../merchants/merchants.module';
import { OfferSideEffectsModule } from '../offer-side-effects.module';

@Module({
  imports: [MerchantsModule, OfferSideEffectsModule],
  controllers: [BundleOfferController],
  providers: [BundleOfferService],
  exports: [BundleOfferService],
})
export class BundleOfferModule {}
