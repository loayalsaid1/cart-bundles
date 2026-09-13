CREATE TYPE "public"."activity_actor_type" AS ENUM('merchant', 'admin', 'system', 'storefront', 'salla');--> statement-breakpoint
CREATE TYPE "public"."activity_severity" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer,
	"actor_type" "activity_actor_type" NOT NULL,
	"actor_id" varchar(64),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(64),
	"entity_id" varchar(64),
	"offer_id" integer,
	"severity" "activity_severity" DEFAULT 'info' NOT NULL,
	"message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "offer_stats" (
	"offer_id" integer PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"impressions" bigint DEFAULT 0 NOT NULL,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"add_to_cart" bigint DEFAULT 0 NOT NULL,
	"conversions" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_stats" ADD CONSTRAINT "offer_stats_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_stats" ADD CONSTRAINT "offer_stats_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_merchant_created_idx" ON "activity_logs" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_offer_idx" ON "activity_logs" USING btree ("offer_id");
