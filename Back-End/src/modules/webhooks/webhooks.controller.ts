import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { IsPublic } from '../../common/decorators';
import { INLINE_WEBHOOK_EVENTS } from './inline-events';
import { SallaWebhookGuard } from './salla-webhook.guard';
import type { SallaAppEventBase } from './types/salla-events';
import { WebhookQueueService } from './webhook-queue.service';
import { WebhooksService } from './webhooks.service';

@IsPublic()
@Controller('salla/webhook')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly webhookQueueService: WebhookQueueService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Post()
  @UseGuards(SallaWebhookGuard)
  async handleWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
  ): Promise<{ status: string }> {
    // The "!" because i moved this validation to teh gaurd already so it's gotta be somehting
    const rawBody = req.rawBody!;
    // validation is already done by SallaWebhookGuard

    const data = JSON.parse(rawBody.toString()) as SallaAppEventBase;
    this.logger.debug(`Webhook received: ${data.event}`);

    if (INLINE_WEBHOOK_EVENTS.has(data.event)) {
      await this.webhooksService.processEvent(data);
    }

    await this.webhookQueueService.enqueue(data);
    return { status: 'success' };
  }
}
