import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed', error);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
      return;
    }
    await this.client.set(key, payload);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const pipeline = this.client.pipeline();
    for (const key of keys) pipeline.unlink(key);
    await pipeline.exec();
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!ttlSeconds || ttlSeconds <= 0) {
      return this.client.incr(key);
    }

    const result = await this.client.eval(
      `local count = redis.call('INCR', KEYS[1])
       if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
       return count`,
      1,
      key,
      ttlSeconds,
    );
    return Number(result);
  }

  async delByPrefix(prefix: string): Promise<number> {
    let cursor = '0';
    let removed = 0;
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        removed += await this.client.unlink(...keys);
      }
    } while (cursor !== '0');
    return removed;
  }

  async delByPrefixes(prefixes: string[]): Promise<number> {
    const counts = await Promise.all(
      prefixes.map((prefix) => this.delByPrefix(prefix)),
    );
    return counts.reduce((sum, count) => sum + count, 0);
  }

  async scanKeys(match: string): Promise<string[]> {
    let cursor = '0';
    const keys: string[] = [];
    do {
      const [next, batch] = await this.client.scan(
        cursor,
        'MATCH',
        match,
        'COUNT',
        100,
      );
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }

  async hIncrBy(key: string, field: string, amount = 1): Promise<void> {
    await this.client.hincrby(key, field, amount);
  }

  async hIncrByFloat(key: string, field: string, amount: number): Promise<void> {
    await this.client.hincrbyfloat(key, field, amount);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  /** Returns true when the lock was acquired (SET NX). */
  async setNx(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    const result = await this.client.eval(
      `if redis.call('GET', KEYS[1]) == ARGV[1]
       then return redis.call('DEL', KEYS[1])
       else return 0 end`,
      1,
      key,
      value,
    );
    return Number(result) === 1;
  }

  /** Atomic move; a missing source key is a no-op. */
  async rename(from: string, to: string): Promise<void> {
    try {
      await this.client.rename(from, to);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('no such key')) throw error;
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const pending = (async () => {
      const lockKey = `lock:cache-build:${key}`;
      const lockValue = randomUUID();
      const acquired = await this.setNx(lockKey, lockValue, 30);
      if (!acquired) {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const populated = await this.get<T>(key);
          if (populated !== null) return populated;
        }
      }

      try {
        const value = await factory();
        await this.set(key, value, ttlSeconds);
        return value;
      } finally {
        if (acquired) await this.releaseLock(lockKey, lockValue);
      }
    })().finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(key, pending);
    return pending;
  }
}
