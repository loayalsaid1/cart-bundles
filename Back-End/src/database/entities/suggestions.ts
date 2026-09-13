import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { merchants } from './merchants';

export const suggestionStatusEnum = pgEnum('suggestion_status', [
  'new',
  'reviewed',
  'planned',
  'done',
  'rejected',
]);

export const suggestions = pgTable(
  'suggestions',
  {
    id: serial('id').primaryKey(),
    merchantId: integer('merchant_id')
      .notNull()
      .references(() => merchants.merchantId, { onDelete: 'cascade' }),
    userId: integer('user_id'),
    title: varchar('title', { length: 160 }).notNull(),
    body: text('body').notNull(),
    status: suggestionStatusEnum('status').notNull().default('new'),
    adminNote: text('admin_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('suggestions_merchant_created_idx').on(
      table.merchantId,
      table.createdAt,
    ),
    index('suggestions_status_idx').on(table.status),
  ],
);

export type Suggestion = typeof suggestions.$inferSelect;
export type NewSuggestion = typeof suggestions.$inferInsert;
