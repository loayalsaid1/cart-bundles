import { Module } from '@nestjs/common';
import { BundleOfferController } from './bundle-offer.controller';
import { BundleOfferService } from './bundle-offer.service';
import { MerchantsModule } from '../../merchants/merchants.module';

@Module({
  imports: [MerchantsModule],
  controllers: [BundleOfferController],
  providers: [BundleOfferService],
  exports: [BundleOfferService],
})
export class BundleOfferModule {}
