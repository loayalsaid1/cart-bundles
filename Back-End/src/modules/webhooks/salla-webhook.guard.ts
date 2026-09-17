import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request as ExpressRequest } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { validateWebhookRequest } from './salla-signature';

@Injectable()
export class SallaWebhookGuard implements CanActivate {
  private readonly logger = new Logger(SallaWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest<ExpressRequest>>();
    const rawBody = req.rawBody;
    
    if (!rawBody) {
      throw new BadRequestException('Raw body is not available');
    }

    const secret = this.configService.getOrThrow<string>('SALLA_WEBHOOK_SECRET');
    const signature = req.headers['x-salla-signature'] as string | undefined;

    const validation = validateWebhookRequest(
      rawBody.toString(),
      signature,
      secret,
    );
    
    if (!validation.success) {
      if (validation.error === 'Missing signature') {
        this.logger.error('Missing signature');
        throw new BadRequestException(validation.error);
      }
      this.logger.error('Invalid signature');
      throw new UnauthorizedException(validation.error);
    }

    return true;
  }
}
