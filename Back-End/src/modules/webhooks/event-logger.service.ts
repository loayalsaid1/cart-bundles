import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../database/drizzle.service';
import { eventLogs } from '../../database/entities/event-logs';
import type { SallaAppEventBase } from './types/salla-events';

@Injectable()
export class EventLoggerService {
  private readonly logger = new Logger(EventLoggerService.name);

  constructor(private readonly drizzleService: DrizzleService) {}

  /** Persist an incoming Salla event for auditing. */
  async logEvent(payload: SallaAppEventBase): Promise<void> {
    try {
      await this.drizzleService.db.insert(eventLogs).values({
        eventName: payload.event,
        eventData: payload,
      });
    } catch (error) {
      this.logger.error('Error logging event', error);
    }
  }
}
