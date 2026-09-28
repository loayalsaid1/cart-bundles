CREATE TYPE "public"."appearance_preset_kind" AS ENUM('colors', 'full');--> statement-breakpoint
CREATE TYPE "public"."appearance_shadow" AS ENUM('none', 'sm', 'md', 'lg');--> statement-breakpoint
CREATE TYPE "public"."title_align" AS ENUM('start', 'center', 'end');--> statement-breakpoint
CREATE TABLE "appearance_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"kind" "appearance_preset_kind" NOT NULL,
	"colors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"border_radius_px" integer,
	"title_align" "title_align",
	"show_border" boolean,
	"shadow" "appearance_shadow",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offer_appearance" ADD COLUMN "title_align" "title_align" DEFAULT 'start' NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_appearance" ADD COLUMN "show_border" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_appearance" ADD COLUMN "shadow" "appearance_shadow" DEFAULT 'sm' NOT NULL;--> statement-breakpoint
ALTER TABLE "appearance_presets" ADD CONSTRAINT "appearance_presets_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appearance_presets_merchant_idx" ON "appearance_presets" USING btree ("merchant_id");