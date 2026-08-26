import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  integer,
  bigint,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { merchants } from './merchants';

/* ────────────────────────────────────────────────────────────────
   ENUMS
   ──────────────────────────────────────────────────────────────── */

export const offerKindEnum = pgEnum('offer_kind', [
  'quantity_discount',
  'product_add_on',
  'bundle',
  'upgrade_offer',
  'cart_recommendation',
]);

export const offerStatusEnum = pgEnum('offer_status', [
  'draft',
  'active',
  'paused',
  'expired',
]);

export const targetTypeEnum = pgEnum('target_type', [
  'all_products',
  'selected_products',
  'selected_categories',
]);

export const pricingTypeEnum = pgEnum('pricing_type', ['percentage', 'fixed']);

export const displayOrientationEnum = pgEnum('display_orientation', [
  'vertical',
  'horizontal',
]);

export const offerTargetTypeEnum = pgEnum('offer_target_entity', ['product', 'category']);

export const recommendationModeEnum = pgEnum('recommendation_mode', [
  'cart_related',
  'general',
]);

/* ────────────────────────────────────────────────────────────────
   BASE TABLE — offers
   ──────────────────────────────────────────────────────────────── */

export const offers = pgTable('offers', {
  id: serial('id').primaryKey(),
  merchantId: integer('merchant_id')
    .notNull()
    .references(() => merchants.merchantId, { onDelete: 'cascade' }),
  kind: offerKindEnum('kind').notNull(),

  // اسم الباقة — internal name
  internalName: varchar('internal_name', { length: 255 }).notNull(),

  // العنوان / العنوان الفرعي — stored as { ar: "...", en: "..." }
  title: jsonb('title').$type<Record<string, string>>().notNull(),
  subtitle: jsonb('subtitle').$type<Record<string, string>>(),

  targetType: targetTypeEnum('target_type').notNull().default('selected_products'),

  expiryDate: timestamp('expiry_date', { withTimezone: true }),
  status: offerStatusEnum('status').notNull().default('draft'),

  redirectToCartAfterAdd: boolean('redirect_to_cart_after_add').notNull().default(false),
  hideSallaPopup: boolean('hide_salla_popup').notNull().default(true),

  sallaOfferId: bigint('salla_offer_id', { mode: 'number' }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

/* ────────────────────────────────────────────────────────────────
   TARGETING — offer_targets
   ──────────────────────────────────────────────────────────────── */

export const offerTargets = pgTable('offer_targets', {
  id: serial('id').primaryKey(),
  offerId: integer('offer_id')
    .notNull()
    .references(() => offers.id, { onDelete: 'cascade' }),
  entityType: offerTargetTypeEnum('entity_type').notNull(),
  sallaEntityId: bigint('salla_entity_id', { mode: 'number' }).notNull(),
});

/* ────────────────────────────────────────────────────────────────
   RELATED PRODUCTS — offer_related_products
   ──────────────────────────────────────────────────────────────── */

export const offerRelatedProducts = pgTable('offer_related_products', {
  id: serial('id').primaryKey(),
  offerId: integer('offer_id')
    .notNull()
    .references(() => offers.id, { onDelete: 'cascade' }),
  sallaProductId: bigint('salla_product_id', { mode: 'number' }).notNull(),
  position: integer('position').notNull().default(0),
  isPreselected: boolean('is_preselected').notNull().default(false),
});

/* ────────────────────────────────────────────────────────────────
   APPEARANCE — offer_appearance
   ──────────────────────────────────────────────────────────────── */

export const offerAppearance = pgTable('offer_appearance', {
  offerId: integer('offer_id')
    .primaryKey()
    .references(() => offers.id, { onDelete: 'cascade' }),
  borderRadiusPx: integer('border_radius_px').notNull().default(0),
  colors: jsonb('colors').$type<Record<string, string>>().notNull().default({}),
});

/* ────────────────────────────────────────────────────────────────
   QUANTITY OFFER SETTINGS & TIERS
   ──────────────────────────────────────────────────────────────── */

export const quantityOfferSettings = pgTable('quantity_offer_settings', {
  offerId: integer('offer_id')
    .primaryKey()
    .references(() => offers.id, { onDelete: 'cascade' }),

  allowDifferentOptionsPerPiece: boolean('allow_different_options_per_piece')
    .notNull()
    .default(false),
  hideThemeDefaultOptions: boolean('hide_theme_default_options').notNull().default(false),

  showPricePerPiece: boolean('show_price_per_piece').notNull().default(false),
  roundPriceToNearestInteger: boolean('round_price_to_nearest_integer')
    .notNull()
    .default(false),
  applyEvenWithCoupon: boolean('apply_even_with_coupon').notNull().default(true),
  hideQuantityField: boolean('hide_quantity_field').notNull().default(false),
});

export const quantityOfferTiers = pgTable('quantity_offer_tiers', {
  id: serial('id').primaryKey(),
  offerId: integer('offer_id')
    .notNull()
    .references(() => offers.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),

  quantity: integer('quantity').notNull(),
  mainTitle: jsonb('main_title').$type<Record<string, string>>().notNull(),
  subtitle: jsonb('subtitle').$type<Record<string, string>>(),

  pricingType: pricingTypeEnum('pricing_type').notNull(),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull(),

  isSelectedByDefault: boolean('is_selected_by_default').notNull().default(false),
  badgeText: varchar('badge_text', { length: 100 }),
  labelText: varchar('label_text', { length: 100 }),
});

/* ────────────────────────────────────────────────────────────────
   ADDITIONAL ITEMS (ADD-ON) SETTINGS
   ──────────────────────────────────────────────────────────────── */

export const addonOfferSettings = pgTable('addon_offer_settings', {
  offerId: integer('offer_id')
    .primaryKey()
    .references(() => offers.id, { onDelete: 'cascade' }),

  maxItems: integer('max_items').notNull().default(8),

  productsPreselectedByDefault: boolean('products_preselected_by_default')
    .notNull()
    .default(false),
  showProductOptions: boolean('show_product_options').notNull().default(false),
  displayOrientation: displayOrientationEnum('display_orientation')
    .notNull()
    .default('horizontal'),

  discountType: pricingTypeEnum('discount_type'),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }),

  positionDesktop: varchar('position_desktop', { length: 50 }),
  positionMobile: varchar('position_mobile', { length: 50 }),
});

/* ────────────────────────────────────────────────────────────────
   BUNDLE OFFER SETTINGS
   ──────────────────────────────────────────────────────────────── */

export const bundleOfferSettings = pgTable('bundle_offer_settings', {
  offerId: integer('offer_id')
    .primaryKey()
    .references(() => offers.id, { onDelete: 'cascade' }),

  discountType: pricingTypeEnum('discount_type'),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }),
});

/* ────────────────────────────────────────────────────────────────
   UPGRADE OFFER SETTINGS
   ──────────────────────────────────────────────────────────────── */

export const upgradeOfferSettings = pgTable('upgrade_offer_settings', {
  offerId: integer('offer_id')
    .primaryKey()
    .references(() => offers.id, { onDelete: 'cascade' }),
  baseSallaProductId: bigint('base_salla_product_id', { mode: 'number' }).notNull(),
  upgradeSallaProductId: bigint('upgrade_salla_product_id', { mode: 'number' }).notNull(),
  couponCode: varchar('coupon_code', { length: 64 }),
  sallaCouponId: bigint('salla_coupon_id', { mode: 'number' }),
});

/* ────────────────────────────────────────────────────────────────
   CART RECOMMENDATIONS SETTINGS
   ──────────────────────────────────────────────────────────────── */

export const recommendationOfferSettings = pgTable('recommendation_offer_settings', {
  offerId: integer('offer_id')
    .primaryKey()
    .references(() => offers.id, { onDelete: 'cascade' }),
  mode: recommendationModeEnum('mode').notNull().default('general'),
  triggerSallaProductId: bigint('trigger_salla_product_id', { mode: 'number' }),
});

/* ────────────────────────────────────────────────────────────────
   NOTE: Inferred types (Offer, NewOffer, etc.) are exported from
   src/modules/offers/types/offers.types.ts — that is the single
   source of truth for all offer-related TypeScript types.
   ──────────────────────────────────────────────────────────────── */
