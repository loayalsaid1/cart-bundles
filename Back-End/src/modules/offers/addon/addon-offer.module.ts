import { Module } from '@nestjs/common';
import { AddonOfferController } from './addon-offer.controller';
import { AddonOfferService } from './addon-offer.service';
import { MerchantsModule } from '../../merchants/merchants.module';

@Module({
  imports: [MerchantsModule],
  controllers: [AddonOfferController],
  providers: [AddonOfferService],
  exports: [AddonOfferService],
})
export class AddonOfferModule {}
