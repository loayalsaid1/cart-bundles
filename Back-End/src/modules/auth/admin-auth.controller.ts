import {
  Body,
  Controller,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { IsPublic } from '../../common/decorators';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@IsPublic()
@Controller('admin')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): { success: boolean } {
    const expected = this.configService.get<string>('ADMIN_PASSWORD');
    if (!expected || dto.password !== expected) {
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
