CREATE TYPE "public"."suggestion_status" AS ENUM('new', 'reviewed', 'planned', 'done', 'rejected');--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"user_id" integer,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"status" "suggestion_status" DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suggestions_merchant_created_idx" ON "suggestions" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "suggestions_status_idx" ON "suggestions" USING btree ("status");
