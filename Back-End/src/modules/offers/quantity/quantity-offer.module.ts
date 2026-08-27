import { Module } from '@nestjs/common';
import { QuantityOfferController } from './quantity-offer.controller';
import { QuantityOfferService } from './quantity-offer.service';
import { MerchantsModule } from '../../merchants/merchants.module';
import { DrizzleModule } from 'src/database/drizzle.module';

@Module({
  imports: [MerchantsModule, DrizzleModule],
  controllers: [QuantityOfferController],
  providers: [QuantityOfferService],
  exports: [QuantityOfferService],
})
export class QuantityOfferModule {}
