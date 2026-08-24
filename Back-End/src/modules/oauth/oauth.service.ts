import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  SallaOAuthTokenResponse,
  SallaUserInfoResponse,
} from './types/salla-oauth.types';

const SALLA_AUTH_URL = 'https://accounts.salla.sa/oauth2/auth';
const SALLA_TOKEN_URL = 'https://accounts.salla.sa/oauth2/token';
const SALLA_USER_INFO_URL = 'https://accounts.salla.sa/oauth2/user/info';

/**
 * Implements Salla's OAuth 2.0 authorization-code flow (Custom Mode).
 * Used by the standalone login page on the app's own domain, independent of
 * the embedded SDK / Easy-Mode webhook flow.
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scope: string;
  private readonly jwtExpiresIn: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('SALLA_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>(
      'SALLA_CLIENT_SECRET',
    );
    this.redirectUri =
      this.configService.getOrThrow<string>('SALLA_REDIRECT_URI');
    this.scope = this.configService.get<string>(
      'SALLA_OAUTH_SCOPE',
      'products.read_write offline_access',
    );
    this.jwtExpiresIn =
      this.configService.get<string>('JWT_EXPIRES_IN') ?? '30m';
  }

  /** Cryptographically random state value to prevent CSRF on the callback. */
  generateState(): string {
    return randomBytes(16).toString('hex');
  }

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state,
    });
    return `${SALLA_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange the authorization code for tokens. Throws on any non-2xx response
   * so the controller can surface a clear error to the login page.
   */
  async exchangeCodeForToken(code: string): Promise<SallaOAuthTokenResponse> {
    const formBody = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    }).toString();

    const response = await fetch(SALLA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    });

    const body = await response.text();

    if (!response.ok) {
      this.logger.error(
        `Salla code exchange failed with status ${response.status}: ${body}`,
      );
      throw new Error(`Salla returned ${response.status}`);
    }

    return JSON.parse(body) as SallaOAuthTokenResponse;
  }

  /**
   * Resolve the merchant/user that authorized the app using the fresh access
   * token, so we can key the `merchants` row the same way the webhook does.
   */
  async fetchUserInfo(
    accessToken: string,
  ): Promise<{ merchantId: number; userId: number }> {
    const response = await fetch(SALLA_USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Salla user info failed with status ${response.status}: ${body}`,
      );
      throw new Error(`Salla returned ${response.status}`);
    }

    const json = (await response.json()) as SallaUserInfoResponse;

    const merchantId = json.data?.merchant?.id;
    const userId = json.data?.id;

    if (!merchantId || !userId) {
      this.logger.error('Salla user info response missing merchant/user id');
      throw new Error('Missing merchant info in Salla response');
    }

    return { merchantId, userId };
  }

  /** Cookie max-age (ms) matching the local JWT expiry, so cookie and token die together. */
  getEmbedTokenMaxAgeMs(): number {
    return OAuthService.parseDurationToMs(this.jwtExpiresIn);
  }

  private static parseDurationToMs(value: string): number {
    const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(value.trim());
    if (!match) return 30 * 60 * 1000;
    const n = Number(match[1]);
    const unit = (match[2] ?? 's').toLowerCase();
    const msPer: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return n * msPer[unit];
  }
}
