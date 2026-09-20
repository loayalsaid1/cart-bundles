import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { users, type User } from '../../database/entities/users';

@Injectable()
export class UsersService {
  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.db;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
    return user ?? null;
  }

  async upsertAdmin(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: [users.email],
        set: {
          name: input.name,
          passwordHash: input.passwordHash,
          role: 'admin',
        },
      })
      .returning();
    return user;
  }
}
