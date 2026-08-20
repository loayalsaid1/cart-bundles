import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsPublic } from '../../common/decorators';
import { AuthService } from './auth.service';

/**
 * Receives the Salla embedded SDK auth token, introspects it against Salla,
 * and issues a local HttpOnly JWT cookie for subsequent API calls.
 */
@IsPublic()
@Controller('salla/embed/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('verify')
  async verify(
    @Query('token') sallaToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    if (!sallaToken) {
      throw new BadRequestException('Salla token is missing');
    }

    const inspectResult = await this.authService.inspectSallaToken(sallaToken);
    if (!inspectResult.success) {
      this.logger.debug(`Salla introspection failed: ${inspectResult.error}`);
      throw new BadRequestException(inspectResult.error);
    }

    const { merchant_id, user_id } = inspectResult.data;
    const jwtToken = this.authService.createEmbedToken({
      merchantId: merchant_id,
      userId: user_id,
    });

    // Partitioned HttpOnly Cookie (CHIPS) so it survives inside the Salla iframe
    res.cookie('embedToken', jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      path: '/',
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    // Ensure the Partitioned attribute is explicitly on the Set-Cookie header
    const setCookie = res.getHeader('set-cookie');
    if (setCookie) {
      const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      if (
        typeof header === 'string' &&
        !header.toLowerCase().includes('partitioned')
      ) {
        res.setHeader('set-cookie', `${header}; Partitioned`);
      }
    }

    return { success: true };
  }
}
