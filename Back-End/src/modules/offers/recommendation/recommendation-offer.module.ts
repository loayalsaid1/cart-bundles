import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../../database/drizzle.module';
import { RecommendationOfferController } from './recommendation-offer.controller';
import { RecommendationOfferService } from './recommendation-offer.service';

@Module({
  imports: [DrizzleModule],
  controllers: [RecommendationOfferController],
  providers: [RecommendationOfferService],
  exports: [RecommendationOfferService],
})
export class RecommendationOfferModule {}
