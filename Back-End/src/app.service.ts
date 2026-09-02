import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from './database/drizzle.service';

@Injectable()
export class AppService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    await this.drizzleService.db.execute(sql`select 1`);
    return { ok: true, message: 'Drizzle is connected.' };
  }
}
