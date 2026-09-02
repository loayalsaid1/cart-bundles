import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../../database/drizzle.module';
import { UpgradeOfferController } from './upgrade-offer.controller';
import { UpgradeOfferService } from './upgrade-offer.service';

@Module({
  imports: [DrizzleModule],
  controllers: [UpgradeOfferController],
  providers: [UpgradeOfferService],
  exports: [UpgradeOfferService],
})
export class UpgradeOfferModule {}
