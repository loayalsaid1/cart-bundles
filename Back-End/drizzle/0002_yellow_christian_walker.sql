ALTER TABLE "addon_offer_settings" ALTER COLUMN "discount_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."addon_discount_type";--> statement-breakpoint
CREATE TYPE "public"."addon_discount_type" AS ENUM('percentage', 'free-product');--> statement-breakpoint
ALTER TABLE "addon_offer_settings" ALTER COLUMN "discount_type" SET DATA TYPE "public"."addon_discount_type" USING "discount_type"::"public"."addon_discount_type";