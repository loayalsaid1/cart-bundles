import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';

@Module({
  imports: [DrizzleModule, ActivityLogModule],
  controllers: [AuthController, AdminAuthController],
  providers: [AuthService, UsersService, AdminAuthService],
  exports: [AuthService, UsersService],
})
export class AuthModule {}
