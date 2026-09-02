import { jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const eventLogs = pgTable('event_logs', {
  id: serial('id').primaryKey(),
  eventName: text('event_name').notNull(),
  eventData: jsonb('event_data').notNull(),
  eventDate: timestamp('event_date').defaultNow().notNull(),
});

export type EventLog = typeof eventLogs.$inferSelect;
export type NewEventLog = typeof eventLogs.$inferInsert;
