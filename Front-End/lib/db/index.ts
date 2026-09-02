import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema'; // Assuming schema is an object of all your tables
import fs from "fs";


// 1. Cache the DB instance directly, not just the pool
const globalForDb = globalThis as unknown as {
  db?: NodePgDatabase<typeof schema>;
};

// 2. Setup the singleton instance
const createDb = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
  });


  pool.on('error', (err) => {
    console.error('Unexpected database error', err);
  });

  return drizzle(pool, { schema });
};

// 3. Export a lazy singleton. Importing the module must not throw when
// DATABASE_URL is unset (e.g. during `next build`); the pool is created on
// first real access instead.
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop) {
    if (!globalForDb.db) {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set.");
      }
      globalForDb.db = createDb();
    }
    const instance = globalForDb.db;
    const value = (instance as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
