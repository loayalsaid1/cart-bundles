ALTER TABLE "quantity_offer_tiers"
  ALTER COLUMN "badge_text" TYPE jsonb
  USING CASE
    WHEN "badge_text" IS NULL OR btrim("badge_text") = '' THEN NULL
    WHEN left(btrim("badge_text"), 1) = '{' THEN "badge_text"::jsonb
    ELSE jsonb_build_object('ar', "badge_text", 'en', "badge_text")
  END;
