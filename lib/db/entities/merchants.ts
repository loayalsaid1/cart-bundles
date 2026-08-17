// Table for merchants data and tokens

import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, integer, varchar, boolean, uniqueIndex } from "drizzle-orm/pg-core";


// Id - created-at - updatedAt - accessToken - RefreshToken - expiresAt
export const merchants = pgTable('merchants', {
    id: serial('id').primaryKey(),
    merchantId: integer('merchant_id').notNull().unique(),
    accessToken: varchar('access_token', { length: 255 }).notNull(),
    refreshToken: varchar('refresh_token', { length: 255 }).notNull(), 
    expiresAt: timestamp('expires_at').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
    },
    (table) => ([
        // uniqueIndex().on(table.merchantId).where(sql`is_active = true`)
    ]) 
)

export type Merchant = typeof merchants.$inferSelect;   
export type NewMerchant = typeof merchants.$inferInsert;