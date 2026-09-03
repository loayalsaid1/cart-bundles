import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from './database/drizzle.module';
import { AuthModule } from './modules/auth/auth.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { ProductsModule } from './modules/products/products.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { OffersModule } from './modules/offers/offers.module';
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
    CacheModule.register({
      isGlobal: true,
      ttl: 5 * 60 * 1000, // 5 minutes in ms
    }),
    ScheduleModule.forRoot(),
    DrizzleModule,
    AuthModule,
    MerchantsModule,
    ProductsModule,
    WebhooksModule,
    OAuthModule,
    OffersModule,
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
