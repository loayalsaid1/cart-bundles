import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { hashPassword } from '../src/common/utils/password';
import { users } from '../src/database/entities/users';

async function bootstrap() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Error: ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is missing from environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const name = email.split('@')[0] || 'admin';
  const passwordHash = await hashPassword(password);

  try {
    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: [users.email],
        set: {
          name,
          passwordHash,
          role: 'admin',
        },
      })
      .returning({ email: users.email });

    console.log(`Seeded admin ${user.email}`);
  } catch (error) {
    console.error('Admin seed failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    process.exit(process.exitCode ?? 0);
  }
}

void bootstrap();
