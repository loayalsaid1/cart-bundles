import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { IsPublic } from '../../common/decorators';
import { validateWebhookRequest } from './salla-signature';
import type { SallaAppEventBase } from './types/salla-events';
import { WebhookStreamService } from './webhook-stream.service';

/**
 * Receives Salla webhook events, verifies the HMAC signature, logs the event,
 * and dispatches it to the matching handler.
 */
@IsPublic()
@Controller('salla/webhook')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly webhookStreamService: WebhookStreamService,
  ) {}

  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
  ): Promise<{ status: string }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body is not available');
    }

    const secret = this.configService.getOrThrow<string>(
      'SALLA_WEBHOOK_SECRET',
    );
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
      } else {
        this.logger.error('Invalid signature');
        throw new UnauthorizedException(validation.error);
      }
    }

    const data = JSON.parse(rawBody.toString()) as SallaAppEventBase;
    this.logger.debug(`Webhook received: ${data.event}`);
    await this.webhookStreamService.enqueue(data);
    return { status: 'success' };
  }
}
