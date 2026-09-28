import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from './database/drizzle.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { ProductsModule } from './modules/products/products.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { OffersModule } from './modules/offers/offers.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ConversionAttributionModule } from './modules/conversion-attribution/conversion-attribution.module';
import { StorefrontEventsModule } from './modules/storefront-events/storefront-events.module';
import { RetentionModule } from './modules/retention/retention.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { SallaAuthGuard } from './common/guards/salla-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        '.env.local',
        `.env.${process.env.NODE_ENV}`,
        '.env',
      ],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    QueueModule,
    DrizzleModule,
    AuthModule,
    MerchantsModule,
    ProductsModule,
    WebhooksModule,
    OAuthModule,
    OffersModule,
    ActivityLogModule,
    AnalyticsModule,
    ConversionAttributionModule,
    StorefrontEventsModule,
    RetentionModule,
    SuggestionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global auth: runs on every route; respects @IsPublic() to opt out
    { provide: APP_GUARD, useClass: SallaAuthGuard },
    // Global role enforcement: runs after SallaAuthGuard (request.user is set)
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
