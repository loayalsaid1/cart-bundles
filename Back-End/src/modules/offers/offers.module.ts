import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { QuantityOfferModule } from './quantity/quantity-offer.module';
import { AddonOfferModule } from './addon/addon-offer.module';
import { BundleOfferModule } from './bundle/bundle-offer.module';
import { UpgradeOfferModule } from './upgrade/upgrade-offer.module';
import { RecommendationOfferModule } from './recommendation/recommendation-offer.module';
import { AppearancePresetsModule } from './appearance-presets/appearance-presets.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { LoggingModule } from '../logging/logging.module';
import { OfferSideEffectsModule } from './offer-side-effects.module';

@Module({
  imports: [
    DrizzleModule,
    MerchantsModule,
    LoggingModule,
    OfferSideEffectsModule,
    QuantityOfferModule,
    AddonOfferModule,
    BundleOfferModule,
    UpgradeOfferModule,
    RecommendationOfferModule,
    AppearancePresetsModule,
  ],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
