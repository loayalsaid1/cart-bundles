import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase, NodePgTransaction } from 'drizzle-orm/node-postgres';
import { ExtractTablesWithRelations } from 'drizzle-orm';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { type Schema, schema } from './schema';

export type DRIZZLE_PROVIDER = NodePgDatabase<Schema>;
export type DrizzleTransaction = NodePgTransaction<Schema, ExtractTablesWithRelations<Schema>>;

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  public db: DRIZZLE_PROVIDER;
  private pool: Pool;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error', err);
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('Database pool closed');
  }
}
