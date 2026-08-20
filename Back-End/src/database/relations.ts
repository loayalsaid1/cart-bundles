import { relations } from 'drizzle-orm/relations';
import { users } from './schema';

/**
 * Drizzle relation graph for the schema.
 * Currently the tables have no foreign keys between them.
 * Add relations here as tables gain FKs, e.g.:
 *
 *   export const merchantsRelations = relations(merchants, ({ many }) => ({
 *     eventLogs: many(eventLogs),
 *   }));
 */
export const usersRelations = relations(users, () => ({}));
