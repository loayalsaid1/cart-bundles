import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, {
  type SignOptions,
  JsonWebTokenError,
  TokenExpiredError,
} from 'jsonwebtoken';
import {
  EmbedContext,
  EmbedTokenVerificationResult,
} from './types/embed-context.interface';
import {
  SallaInspectResult,
  SallaIntrospectData,
} from './types/salla-token.interface';

export const TOKEN_EXPIRED_ERROR = 'TokenExpiredError';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: SignOptions['expiresIn'];
  private readonly sallaAppId: string;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.jwtExpiresIn = (this.configService.get<string>('JWT_EXPIRES_IN') ??
      '30m') as SignOptions['expiresIn'];
    this.sallaAppId = this.configService.getOrThrow<string>('SALLA_APP_ID');
  }

  /**
   * Introspect a Salla embedded SDK token via the exchange-authority API.
   * Returns merchant_id / user_id on success, or a descriptive error.
   */
  async inspectSallaToken(token: string): Promise<SallaInspectResult> {
    try {
      const url = 'https://api.salla.dev/exchange-authority/v1/introspect';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'S-Source': this.sallaAppId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Salla API returned ${response.status}`,
          isUpstreamError: true,
        };
      }

      const result = (await response.json()) as {
        success?: boolean;
        data?: SallaIntrospectData;
      };

      if (result.success && result.data) {
        return { success: true, data: result.data };
      }

      return { success: false, error: 'Salla returned success: false' };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Unknown introspection error',
      };
    }
  }

  /**
   * Sign a local JWT for the embedded app session (defaults to 30m expiry).
   */
  createEmbedToken(data: EmbedContext): string {
    return jwt.sign(data, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    });
  }

  /**
   * Verify a local embed JWT and return the merchant/user context.
   */
  verifyEmbedToken(token: string): EmbedTokenVerificationResult {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as EmbedContext;
      return { success: true, data: payload };
    } catch (error) {
      let errorValue: string;
      if (error instanceof TokenExpiredError) {
        errorValue = TOKEN_EXPIRED_ERROR;
        this.logger.debug('Embed token expired');
      } else if (error instanceof JsonWebTokenError) {
        errorValue = error.message;
        this.logger.debug(`Embed token rejected: ${error.message}`);
      } else {
        errorValue = 'Invalid embed access token';
        this.logger.debug(`Embed token rejected: ${error}`);
      }
      return { success: false, error: errorValue };
    }
  }
}
