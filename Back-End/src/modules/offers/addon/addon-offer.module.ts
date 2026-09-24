import { Module } from '@nestjs/common';
import { AddonOfferController } from './addon-offer.controller';
import { AddonOfferService } from './addon-offer.service';
import { MerchantsModule } from '../../merchants/merchants.module';
import { OfferSideEffectsModule } from '../offer-side-effects.module';

@Module({
  imports: [MerchantsModule, OfferSideEffectsModule],
  controllers: [AddonOfferController],
  providers: [AddonOfferService],
  exports: [AddonOfferService],
})
export class AddonOfferModule {}
