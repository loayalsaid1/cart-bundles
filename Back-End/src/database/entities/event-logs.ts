import { jsonb, pgTable, serial, integer, text, timestamp, index } from 'drizzle-orm/pg-core';

export const eventLogs = pgTable('event_logs', {
  id: serial('id').primaryKey(),
  merchantId: integer('merchant_id').notNull(),
  eventName: text('event_name').notNull(),
  eventData: jsonb('event_data').notNull(),
  eventDate: timestamp('event_date').defaultNow().notNull(),
}, (table) => [
  index('event_logs_merchant_date_idx').on(table.merchantId, table.eventDate),
]);

export type EventLog = typeof eventLogs.$inferSelect;
export type NewEventLog = typeof eventLogs.$inferInsert;  
