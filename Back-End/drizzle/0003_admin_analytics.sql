ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_hash" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "role" varchar(32) NOT NULL DEFAULT 'admin';
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "merchants"
  ADD COLUMN IF NOT EXISTS "store_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "store_email" varchar(255),
  ADD COLUMN IF NOT EXISTS "store_domain" varchar(255),
  ADD COLUMN IF NOT EXISTS "avatar" varchar(512),
  ADD COLUMN IF NOT EXISTS "uninstalled_at" timestamp;
--> statement-breakpoint
ALTER TABLE "offer_stats"
  ADD COLUMN IF NOT EXISTS "revenue_generated" numeric(14, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "revenue_attributed" numeric(14, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "conversions_attributed" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "daily_stats"
  ADD COLUMN IF NOT EXISTS "revenue_generated" numeric(14, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "revenue_attributed" numeric(14, 2) DEFAULT '0' NOT NULL,
  ADD COLUMN IF NOT EXISTS "conversions_attributed" bigint DEFAULT 0 NOT NULL;
