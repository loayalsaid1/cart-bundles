import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { merchants, type Merchant } from '../../database/entities/merchants';
import type { SallaTokenData } from '../auth/types/salla-token.interface';

const TOKEN_CACHE_PREFIX = 'merchant:token:';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry

export interface MerchantAuthorizeInput {
  merchantId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.clientId = this.configService.getOrThrow<string>('SALLA_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>(
      'SALLA_CLIENT_SECRET',
    );
  }

  private get db() {
    return this.drizzleService.db;
  }

  async findByMerchantId(merchantId: number): Promise<Merchant | null> {
    const merchant = await this.db.query.merchants.findFirst({
      where: eq(merchants.merchantId, merchantId),
    });
    return merchant ?? null;
  }

  /**
   * Insert the merchant on first authorization, or update their tokens.
   * Triggered by the `app.store.authorize` webhook.
   */
  async upsertAuthorized(input: MerchantAuthorizeInput): Promise<void> {
    await this.db
      .insert(merchants)
      .values({
        merchantId: input.merchantId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [merchants.merchantId],
        set: {
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
          expiresAt: input.expiresAt,
          isActive: true,
        },
      });
  }

  /** Deactivate a merchant on `app.uninstalled`. */
  async deactivate(merchantId: number): Promise<void> {
    await this.db
      .update(merchants)
      .set({ isActive: false })
      .where(eq(merchants.merchantId, merchantId));
  }

  /**
   * Return a valid Salla access token for the merchant.
   * Cache-first; on a miss (or near-expiry) it refreshes the token through
   * Salla OAuth and stores the fresh value with a TTL bounded by its expiry.
   */
  async getValidAccessToken(merchantId: number): Promise<string | null> {
    const cacheKey = `${TOKEN_CACHE_PREFIX}${merchantId}`;
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) return cached;

    const tokenData = await this.getToken(merchantId);
    if (!tokenData) return null;

    const ttlSeconds = Math.max(
      60,
      Math.floor(
        (tokenData.expiresAt.getTime() - Date.now() - TOKEN_REFRESH_BUFFER_MS) /
          1000,
      ),
    );

    await this.cacheManager.set(cacheKey, tokenData.accessToken, ttlSeconds);
    return tokenData.accessToken;
  }

  /** Read the stored token, refreshing via Salla OAuth if near expiry. */
  private async getToken(merchantId: number): Promise<SallaTokenData | null> {
    const merchant = await this.findByMerchantId(merchantId);
    if (!merchant) return null;

    if (merchant.expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
      return {
        merchantId: merchant.merchantId,
        accessToken: merchant.accessToken,
        refreshToken: merchant.refreshToken,
        expiresAt: merchant.expiresAt,
      };
    }

    const refreshed = await this.refreshToken(
      merchant.merchantId,
      merchant.refreshToken,
    );
    if (!refreshed) {
      throw new Error('Failed to refresh Salla access token');
    }

    await this.updateToken(merchant.merchantId, refreshed);
    return refreshed;
  }

  private async refreshToken(
    merchantId: number,
    refreshToken: string,
  ): Promise<SallaTokenData | null> {
    const url = 'https://accounts.salla.sa/oauth2/token';
    const details: Record<string, string> = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    const formBody = Object.keys(details)
      .map(
        (key) =>
          encodeURIComponent(key) + '=' + encodeURIComponent(details[key]),
      )
      .join('&');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
      });

      if (!response.ok) {
        this.logger.error(
          `Salla token refresh failed with status ${response.status}: ${await response.text()}`,
        );
        return null;
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      return {
        merchantId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to refresh Salla access token', error);
      return null;
    }
  }

  private async updateToken(
    merchantId: number,
    newToken: SallaTokenData,
  ): Promise<void> {
    await this.db
      .update(merchants)
      .set({
        accessToken: newToken.accessToken,
        refreshToken: newToken.refreshToken,
        expiresAt: newToken.expiresAt,
        isActive: true,
      })
      .where(eq(merchants.merchantId, merchantId));

    // Invalidate any stale cached token immediately after refresh
    await this.cacheManager.del(`${TOKEN_CACHE_PREFIX}${merchantId}`);
  }
}
