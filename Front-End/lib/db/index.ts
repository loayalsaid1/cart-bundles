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
    ssl: {
      rejectUnauthorized: false,
      // ca: fs.readFileSync("/ca.pem").toString(),
    },
  });


  pool.on('error', (err) => {
    console.error('Unexpected database error', err);
  });

  return drizzle(pool, { schema });
};

// 3. Export the singleton. 
// If it exists on globalThis (HMR dev mode), use it. Otherwise, create it.
export const db = globalForDb.db ?? createDb();

// 4. In development, save it to the global object so HMR doesn't spam connections
if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}