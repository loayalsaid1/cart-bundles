import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const clientId = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;
    
    // Default rate limit key based on class, handler, and client IP
    const rateKey = `rate:${className}:${handlerName}:${clientId}`;

    const count = await this.redis.incr(rateKey, options.window);
    if (count > options.max) {
      throw new HttpException(
        { status: 'throttled', message: 'Too Many Requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
