import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { merchants, type Merchant } from '../../database/entities/merchants';
import {
  merchantCatalogPrefixes,
  merchantDashboardPrefix,
  merchantStatusCacheKey,
  merchantStorefrontPrefix,
  merchantTokenCacheKey,
} from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import type { SallaTokenData } from '../auth/types/salla-token.interface';
import {
  MerchantAuthorizeInput,
  RefreshResult,
  TokenResult,
} from './interfaces/merchnatToken.interface';
import type { MerchantProfileFields } from './types/salla-store-info.types';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const TOKEN_REFRESH_LOCK_TTL_SECONDS = 30;

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  /**
   * De-dupes concurrent refresh attempts for the same merchant so a burst
   * of requests near expiry triggers exactly one call to Salla, not one
   * per request.
   */
  private readonly inFlightRefreshes = new Map<
    number,
    Promise<RefreshResult>
  >();

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
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
          uninstalledAt: null,
        },
      });
    await this.invalidateMerchantCache(input.merchantId);
  }

  async updateProfile(
    merchantId: number,
    fields: MerchantProfileFields,
  ): Promise<string[]> {
    const existing = await this.findByMerchantId(merchantId);
    if (!existing) return [];
    const changedFields = (
      Object.keys(fields) as Array<keyof MerchantProfileFields>
    ).filter((field) => existing[field] !== fields[field]);
    await this.db
      .update(merchants)
      .set({
        storeName: fields.storeName,
        storeEmail: fields.storeEmail,
        storeDomain: fields.storeDomain,
        avatar: fields.avatar,
      })
      .where(eq(merchants.merchantId, merchantId));
    return changedFields;
  }

  /** Deactivate a merchant on `app.uninstalled`. */
  async deactivate(merchantId: number, uninstalledAt?: Date): Promise<void> {
    await this.db
      .update(merchants)
      .set({
        isActive: false,
        uninstalledAt: uninstalledAt ?? new Date(),
      })
      .where(eq(merchants.merchantId, merchantId));
    await this.invalidateMerchantCache(merchantId);
  }

  async invalidateMerchantCache(merchantId: number): Promise<void> {
    await Promise.all([
      this.redis.delKeys([
        merchantTokenCacheKey(merchantId),
        merchantStatusCacheKey(merchantId),
      ]),
      this.redis.delByPrefixes(merchantCatalogPrefixes(merchantId)),
      this.redis.delByPrefix(merchantStorefrontPrefix(merchantId)),
      this.redis.delByPrefix(merchantDashboardPrefix(merchantId)),
    ]);
  }

  async invalidateCatalogCache(merchantId: number): Promise<void> {
    await this.redis.delByPrefixes(merchantCatalogPrefixes(merchantId));
  }

  async invalidateStorefrontCache(merchantId: number): Promise<void> {
    await this.redis.delByPrefixes([
      merchantStorefrontPrefix(merchantId),
      merchantDashboardPrefix(merchantId),
    ]);
  }

  /**
   * Return a valid Salla access token for the merchant.
   * Cache-first; on a miss (or near-expiry) it refreshes the token through
   * Salla OAuth and stores the fresh value with a TTL bounded by its expiry.
   */
  private isFresh(m: Merchant): boolean {
    return m.expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS > Date.now();
  }

  async getValidAccessToken(merchantId: number): Promise<TokenResult> {
    const cached = await this.redis.get<string>(merchantTokenCacheKey(merchantId));
    if (cached) return { success: true, accessToken: cached };

    const merchant = await this.findByMerchantId(merchantId);
    if (!merchant) return { success: false, reason: 'not_found' };

    if (this.isFresh(merchant)) {
      await this.cacheToken(merchantId, merchant.accessToken, merchant.expiresAt);
      return { success: true, accessToken: merchant.accessToken };
    }

    const result = await this.refreshOnce(merchantId);
    if (!result.success) {
      if (result.reason === 'reauth_required') await this.deactivate(merchantId);
      return result;
    }

    await this.cacheToken(merchantId, result.data.accessToken, result.data.expiresAt);
    return { success: true, accessToken: result.data.accessToken };
  }

  /** Per-process dedupe + cross-process lock. */
  private refreshOnce(merchantId: number): Promise<RefreshResult> {
    const existing = this.inFlightRefreshes.get(merchantId);
    if (existing) return existing;

    const p = this.withLock(
      `lock:merchant-token-refresh:${merchantId}`,
      () => this.refreshIfStale(merchantId),
    )
      .then(
        (r): RefreshResult =>
          r ?? { success: false, reason: 'refresh_failed', error: 'Timed out waiting for refresh lock' },
      )
      .finally(() => this.inFlightRefreshes.delete(merchantId));

    this.inFlightRefreshes.set(merchantId, p);
    return p;
  }

  /** Runs inside the lock: re-read, skip if someone already refreshed, else refresh + persist. */
  private async refreshIfStale(merchantId: number): Promise<RefreshResult> {
    const merchant = await this.findByMerchantId(merchantId);
    if (!merchant) {
      return { success: false, reason: 'refresh_failed', error: 'Merchant not found' };
    }

    if (this.isFresh(merchant)) {
      return {
        success: true,
        data: {
          merchantId,
          accessToken: merchant.accessToken,
          refreshToken: merchant.refreshToken,
          expiresAt: merchant.expiresAt,
        },
      };
    }

    const result = await this.refreshToken(merchantId, merchant.refreshToken);
    if (result.success) await this.updateToken(merchantId, result.data);
    return result;
  }

  /** Generic lock helper. Returns null if the lock couldn't be acquired in time. */
  private async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    timeoutMs = 10_000,
  ): Promise<T | null> {
    const token = randomUUID();
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await this.redis.setNx(key, token, TOKEN_REFRESH_LOCK_TTL_SECONDS)) {
        try {
          return await fn();
        } finally {
          await this.redis.releaseLock(key, token);
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  }

  private async refreshToken(
    merchantId: number,
    refreshToken: string,
  ): Promise<RefreshResult> {
    const url = 'https://accounts.salla.sa/oauth2/token';
    const formBody = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
      });

      if (!response.ok) {
        const body = await response.text();

        // Salla returns 400/401 when the refresh token itself is invalid
        // or revoked — that's not transient, the merchant must re-auth.
        if (response.status === 400 || response.status === 401) {
          this.logger.warn(
            `Salla rejected refresh token for merchant ${merchantId}: ${body}`,
          );
          return { success: false, reason: 'reauth_required' };
        }

        this.logger.error(
          `Salla token refresh failed with status ${response.status}: ${body}`,
        );
        return {
          success: false,
          reason: 'refresh_failed',
          error: `Salla returned ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      return {
        success: true,
        data: {
          merchantId,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown refresh error';
      this.logger.error(
        `Failed to refresh Salla access token for merchant ${merchantId}`,
        error,
      );
      return { success: false, reason: 'refresh_failed', error: message };
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
  }

  private async cacheToken(
    merchantId: number,
    accessToken: string,
    expiresAt: Date,
  ): Promise<void> {
    const cacheKey = merchantTokenCacheKey(merchantId);
    const ttlSeconds = Math.max(
      60,
      Math.floor(
        (expiresAt.getTime() - Date.now() - TOKEN_REFRESH_BUFFER_MS) / 1000,
      ),
    );
    await this.redis.set(cacheKey, accessToken, ttlSeconds);
  }
}
