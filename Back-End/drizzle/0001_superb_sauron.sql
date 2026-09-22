DROP INDEX "activity_logs_action_idx";--> statement-breakpoint
DROP INDEX "activity_logs_merchant_created_idx";--> statement-breakpoint
DROP INDEX "activity_logs_offer_idx";--> statement-breakpoint
DROP INDEX "suggestions_merchant_created_idx";--> statement-breakpoint
DROP INDEX "suggestions_status_idx";--> statement-breakpoint
DROP INDEX "event_logs_merchant_date_idx";--> statement-breakpoint
ALTER TABLE "quantity_offer_tiers" ALTER COLUMN "badge_text" SET DATA TYPE jsonb USING CASE WHEN badge_text IS NULL THEN NULL WHEN badge_text ~ '^\s*[\{\[]' THEN badge_text::jsonb ELSE to_jsonb(badge_text) END;--> statement-breakpoint
ALTER TABLE "offer_stats" ADD COLUMN "revenue_generated" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_stats" ADD COLUMN "revenue_attributed" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_stats" ADD COLUMN "conversions_attributed" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" varchar(32) DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "store_name" varchar(255);--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "store_email" varchar(255);--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "store_domain" varchar(255);--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "avatar" varchar(512);--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "uninstalled_at" timestamp;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD COLUMN "revenue_generated" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD COLUMN "revenue_attributed" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD COLUMN "conversions_attributed" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_merchant_created_idx" ON "activity_logs" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_offer_idx" ON "activity_logs" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "suggestions_merchant_created_idx" ON "suggestions" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "suggestions_status_idx" ON "suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_logs_merchant_date_idx" ON "event_logs" USING btree ("merchant_id","event_date");