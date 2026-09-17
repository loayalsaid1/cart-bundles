import { Module } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { AdminAuthController } from './admin-auth.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [LoggingModule],
  controllers: [AuthController, AdminAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
