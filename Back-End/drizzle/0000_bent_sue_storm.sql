-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."activity_actor_type" AS ENUM('merchant', 'admin', 'system', 'storefront', 'salla');--> statement-breakpoint
CREATE TYPE "public"."activity_severity" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."addon_discount_type" AS ENUM('percentage', 'free-product');--> statement-breakpoint
CREATE TYPE "public"."bundle_discount_type" AS ENUM('percentage', 'free-product');--> statement-breakpoint
CREATE TYPE "public"."display_orientation" AS ENUM('vertical', 'horizontal');--> statement-breakpoint
CREATE TYPE "public"."offer_kind" AS ENUM('quantity_discount', 'product_add_on', 'bundle', 'upgrade_offer', 'cart_recommendation');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('draft', 'active', 'paused', 'expired');--> statement-breakpoint
CREATE TYPE "public"."offer_target_entity" AS ENUM('product', 'category');--> statement-breakpoint
CREATE TYPE "public"."pricing_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."recommendation_mode" AS ENUM('cart_related', 'general');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('new', 'reviewed', 'planned', 'done', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."target_type" AS ENUM('all_products', 'selected_products', 'selected_categories');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "offer_stats" (
	"offer_id" integer PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"impressions" bigint DEFAULT 0 NOT NULL,
	"clicks" bigint DEFAULT 0 NOT NULL,
	"add_to_cart" bigint DEFAULT 0 NOT NULL,
	"conversions" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE TABLE "addon_offer_settings" (
	"offer_id" integer PRIMARY KEY NOT NULL,
	"max_items" integer DEFAULT 8 NOT NULL,
	"products_preselected_by_default" boolean DEFAULT false NOT NULL,
	"show_product_options" boolean DEFAULT false NOT NULL,
	"display_orientation" "display_orientation" DEFAULT 'horizontal' NOT NULL,
	"discount_type" "addon_discount_type",
	"discount_amount" numeric(10, 2),
	"position_desktop" varchar(50),
	"position_mobile" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "bundle_offer_settings" (
	"offer_id" integer PRIMARY KEY NOT NULL,
	"discount_type" "bundle_discount_type",
	"discount_amount" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "offer_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"offer_id" integer NOT NULL,
	"entity_type" "offer_target_entity" NOT NULL,
	"salla_entity_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upgrade_offer_settings" (
	"offer_id" integer PRIMARY KEY NOT NULL,
	"base_salla_product_id" bigint NOT NULL,
	"upgrade_salla_product_id" bigint NOT NULL,
	"coupon_code" varchar(64),
	"salla_coupon_id" bigint
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"kind" "offer_kind" NOT NULL,
	"internal_name" varchar(255) NOT NULL,
	"title" jsonb NOT NULL,
	"subtitle" jsonb,
	"target_type" "target_type" DEFAULT 'selected_products' NOT NULL,
	"expiry_date" timestamp with time zone,
	"status" "offer_status" DEFAULT 'draft' NOT NULL,
	"redirect_to_cart_after_add" boolean DEFAULT false NOT NULL,
	"hide_salla_popup" boolean DEFAULT true NOT NULL,
	"salla_offer_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_appearance" (
	"offer_id" integer PRIMARY KEY NOT NULL,
	"border_radius_px" integer DEFAULT 0 NOT NULL,
	"colors" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_related_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"offer_id" integer NOT NULL,
	"salla_product_id" bigint NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_preselected" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quantity_offer_settings" (
	"offer_id" integer PRIMARY KEY NOT NULL,
	"allow_different_options_per_piece" boolean DEFAULT false NOT NULL,
	"hide_theme_default_options" boolean DEFAULT false NOT NULL,
	"show_price_per_piece" boolean DEFAULT false NOT NULL,
	"round_price_to_nearest_integer" boolean DEFAULT false NOT NULL,
	"apply_even_with_coupon" boolean DEFAULT true NOT NULL,
	"hide_quantity_field" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quantity_offer_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"offer_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"quantity" integer NOT NULL,
	"main_title" jsonb NOT NULL,
	"subtitle" jsonb,
	"pricing_type" "pricing_type" NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"is_selected_by_default" boolean DEFAULT false NOT NULL,
	"badge_text" varchar(100),
	"label_text" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "recommendation_offer_settings" (
	"offer_id" integer PRIMARY KEY NOT NULL,
	"mode" "recommendation_mode" DEFAULT 'general' NOT NULL,
	"trigger_salla_product_id" bigint
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_id" integer NOT NULL,
	"access_token" varchar(255) NOT NULL,
	"refresh_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_merchant_id_unique" UNIQUE("merchant_id")
);
--> statement-breakpoint
CREATE TABLE "event_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"event_data" jsonb NOT NULL,
	"event_date" timestamp DEFAULT now() NOT NULL,
	"merchant_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
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
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_stats" ADD CONSTRAINT "offer_stats_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_stats" ADD CONSTRAINT "offer_stats_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_offer_settings" ADD CONSTRAINT "addon_offer_settings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_offer_settings" ADD CONSTRAINT "bundle_offer_settings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_targets" ADD CONSTRAINT "offer_targets_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrade_offer_settings" ADD CONSTRAINT "upgrade_offer_settings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_appearance" ADD CONSTRAINT "offer_appearance_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_related_products" ADD CONSTRAINT "offer_related_products_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantity_offer_settings" ADD CONSTRAINT "quantity_offer_settings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantity_offer_tiers" ADD CONSTRAINT "quantity_offer_tiers_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_offer_settings" ADD CONSTRAINT "recommendation_offer_settings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_merchant_id_merchants_merchant_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action" text_ops);--> statement-breakpoint
CREATE INDEX "activity_logs_merchant_created_idx" ON "activity_logs" USING btree ("merchant_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "activity_logs_offer_idx" ON "activity_logs" USING btree ("offer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "suggestions_merchant_created_idx" ON "suggestions" USING btree ("merchant_id" int4_ops,"created_at" int4_ops);--> statement-breakpoint
CREATE INDEX "suggestions_status_idx" ON "suggestions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "event_logs_merchant_date_idx" ON "event_logs" USING btree ("merchant_id" int4_ops,"event_date" int4_ops);
*/