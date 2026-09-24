import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  IsPublic,
  requireMerchantId,
} from '../../common/decorators';
import { AuthService } from '../auth/auth.service';
import type { EmbedContext } from '../auth/types/embed-context.interface';
import { MerchantProfileService } from '../merchants/merchant-profile.service';
import { MerchantsService } from '../merchants/merchants.service';
import { TokenExchangeDto } from './dto/token-exchange.dto';
import { OAuthService } from './oauth.service';
import type { SallaOAuthTokenResponse } from './types/salla-oauth.types';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Salla OAuth 2.0 authorization-code flow (Custom Mode) for the standalone
 * login page on the app's own domain. The embedded SDK / Easy-Mode webhook
 * flow is intentionally left untouched.
 */
@Controller('salla/oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly authService: AuthService,
    private readonly merchantsService: MerchantsService,
    private readonly merchantProfile: MerchantProfileService,
  ) {}

  /** Step 1: redirect the merchant's browser to Salla to authorize the app. */
  @IsPublic()
  @Get('authorize')
  authorize(@Req() req: Request, @Res() res: Response): void {
    const state = this.oauthService.generateState();
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: OAUTH_STATE_TTL_MS,
    });
    res.redirect(this.oauthService.buildAuthorizeUrl(state));
  }

  /**
   * Step 2: Salla redirects back with `?code=...&state=...`; the frontend
   * callback page posts them here. Exchanges the code, stores tokens keyed by
   * merchant_id, and issues the same local `embedToken` cookie used elsewhere.
   */
  @IsPublic()
  @Post('token')
  async token(
    @Body() dto: TokenExchangeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; merchantId: number; userId: number }> {
    const cookies = (req as unknown as { cookies?: Record<string, string> })
      .cookies;
    const expectedState = cookies?.[OAUTH_STATE_COOKIE];

    if (!expectedState || expectedState !== dto.state) {
      throw new BadRequestException('Invalid OAuth state');
    }
    res.clearCookie(OAUTH_STATE_COOKIE);

    let tokenResponse: SallaOAuthTokenResponse;
    try {
      tokenResponse = await this.oauthService.exchangeCodeForToken(dto.code);
    } catch (error) {
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Token exchange failed',
      );
    }

    let userInfo: { merchantId: number; userId: number };
    try {
      userInfo = await this.oauthService.fetchUserInfo(
        tokenResponse.access_token,
      );
    } catch (error) {
      throw new BadGatewayException(
        error instanceof Error
          ? error.message
          : 'Failed to fetch merchant info',
      );
    }

    const expiresInSeconds = tokenResponse.expires_in ?? tokenResponse.expires;
    const expiresAt = new Date(
      Date.now() + (expiresInSeconds ?? 1209599) * 1000,
    );

    await this.merchantsService.upsertAuthorized({
      merchantId: userInfo.merchantId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
    });

    try {
      await this.merchantProfile.refresh(
        userInfo.merchantId,
        tokenResponse.access_token,
      );
    } catch {
      // Fail-soft: tokens already persisted so the merchant can retry later.
    }

    const jwtToken = this.authService.createEmbedToken({
      merchantId: userInfo.merchantId,
      userId: userInfo.userId,
    });

    res.cookie('embedToken', jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      path: '/',
      maxAge: this.oauthService.getEmbedTokenMaxAgeMs(),
    });

    return {
      success: true,
      merchantId: userInfo.merchantId,
      userId: userInfo.userId,
    };
  }

  /** Clears the local session cookie. */
  @IsPublic()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { success: boolean } {
    res.clearCookie('embedToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      path: '/',
    });
    return { success: true };
  }

  /** Protected: returns the merchant/user id from the local JWT. */
  @Get('me')
  me(@CurrentUser() user: EmbedContext): {
    merchantId: number;
    userId: number;
  } {
    return { merchantId: requireMerchantId(user), userId: user.userId };
  }
}
