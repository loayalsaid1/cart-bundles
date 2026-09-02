import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [AuthModule, MerchantsModule],
  controllers: [OAuthController],
  providers: [OAuthService],
})
export class OAuthModule {}
