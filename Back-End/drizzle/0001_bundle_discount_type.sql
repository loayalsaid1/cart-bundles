CREATE TYPE "public"."bundle_discount_type" AS ENUM('percentage', 'free-product');--> statement-breakpoint
ALTER TABLE "bundle_offer_settings" ALTER COLUMN "discount_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bundle_offer_settings" ALTER COLUMN "discount_type" SET DATA TYPE "public"."bundle_discount_type" USING (
  CASE
    WHEN "discount_type"::text = 'percentage' THEN 'percentage'::"public"."bundle_discount_type"
    ELSE NULL
  END
);
