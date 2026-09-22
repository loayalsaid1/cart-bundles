import {
  Body,
  Controller,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { IsPublic, RateLimit } from '../../common/decorators';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ActivityService } from '../logging/activity/activity.service';
import { AdminAuthService } from './admin-auth.service';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@IsPublic()
@Controller('admin')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminAuthService: AdminAuthService,
    private readonly activityService: ActivityService,
  ) {}

  @Post('login')
  @RateLimit({ window: 60, max: 5 })
  @UseGuards(RateLimitGuard)
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    try {
      const { userId } = await this.adminAuthService.login(
        dto.email,
        dto.password,
      );
      const token = this.authService.createEmbedToken({
        userId,
        role: 'admin',
      });

      res.cookie('adminToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 12 * 60 * 60 * 1000,
      });

      return { success: true };
    } catch {
      const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
      await this.activityService.enqueue({
        merchantId: null,
        actorType: 'admin',
        action: 'admin.login_failed',
        severity: 'warn',
        message: 'Admin login failed',
        metadata: { ip, attempt: 'failed' },
      });
      throw new UnauthorizedException('Invalid admin credentials');
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { success: boolean } {
    res.clearCookie('adminToken', { path: '/' });
    return { success: true };
  }
}
