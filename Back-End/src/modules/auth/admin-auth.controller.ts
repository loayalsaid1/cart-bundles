import {
  Body,
  Controller,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { IsPublic, RateLimit } from '../../common/decorators';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ActivityService } from '../logging/activity.service';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@IsPublic()
@Controller('admin')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
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
    const expected = this.configService.get<string>('ADMIN_PASSWORD');
    if (!expected || dto.password !== expected) {
      const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
      await this.activityService.enqueue({
        merchantId: null,
        actorType: 'admin',
        action: 'admin.login_failed',
        severity: 'warn',
        message: 'Admin login failed',
        metadata: { ip, attempt: 'failed' },
      });
      throw new UnauthorizedException('Invalid admin password');
    }

    const token = this.authService.createEmbedToken({
      merchantId: 0,
      userId: 0,
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
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { success: boolean } {
    res.clearCookie('adminToken', { path: '/' });
    return { success: true };
  }
}
