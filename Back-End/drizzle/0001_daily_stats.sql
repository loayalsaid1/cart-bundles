CREATE TABLE IF NOT EXISTS "daily_stats" (
	"merchant_id" integer NOT NULL,
	"date" date NOT NULL,
	"impressions" bigint DEFAULT 0 NOT NULL,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"add_to_cart" bigint DEFAULT 0 NOT NULL,
	"conversions" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_stats_pk" PRIMARY KEY("merchant_id","date")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
