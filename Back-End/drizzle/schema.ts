import { pgTable, index, foreignKey, bigserial, integer, varchar, text, jsonb, timestamp, bigint, serial, boolean, numeric, unique, primaryKey, date, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const activityActorType = pgEnum("activity_actor_type", ['merchant', 'admin', 'system', 'storefront', 'salla'])
export const activitySeverity = pgEnum("activity_severity", ['info', 'warn', 'error'])
export const addonDiscountType = pgEnum("addon_discount_type", ['percentage', 'free-product'])
export const bundleDiscountType = pgEnum("bundle_discount_type", ['percentage', 'free-product'])
export const displayOrientation = pgEnum("display_orientation", ['vertical', 'horizontal'])
export const offerKind = pgEnum("offer_kind", ['quantity_discount', 'product_add_on', 'bundle', 'upgrade_offer', 'cart_recommendation'])
export const offerStatus = pgEnum("offer_status", ['draft', 'active', 'paused', 'expired'])
export const offerTargetEntity = pgEnum("offer_target_entity", ['product', 'category'])
export const pricingType = pgEnum("pricing_type", ['percentage', 'fixed'])
export const recommendationMode = pgEnum("recommendation_mode", ['cart_related', 'general'])
export const suggestionStatus = pgEnum("suggestion_status", ['new', 'reviewed', 'planned', 'done', 'rejected'])
export const targetType = pgEnum("target_type", ['all_products', 'selected_products', 'selected_categories'])


export const activityLogs = pgTable("activity_logs", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	merchantId: integer("merchant_id"),
	actorType: activityActorType("actor_type").notNull(),
	actorId: varchar("actor_id", { length: 64 }),
	action: varchar({ length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 64 }),
	entityId: varchar("entity_id", { length: 64 }),
	offerId: integer("offer_id"),
	severity: activitySeverity().default('info').notNull(),
	message: text(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("activity_logs_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("activity_logs_merchant_created_idx").using("btree", table.merchantId.asc().nullsLast().op("int4_ops"), table.createdAt.asc().nullsLast().op("int4_ops")),
	index("activity_logs_offer_idx").using("btree", table.offerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.merchantId],
			foreignColumns: [merchants.merchantId],
			name: "activity_logs_merchant_id_merchants_merchant_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "activity_logs_offer_id_offers_id_fk"
		}).onDelete("set null"),
]);

export const offerStats = pgTable("offer_stats", {
	offerId: integer("offer_id").primaryKey().notNull(),
	merchantId: integer("merchant_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	impressions: bigint({ mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clicks: bigint({ mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	addToCart: bigint("add_to_cart", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	conversions: bigint({ mode: "number" }).default(0).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "offer_stats_offer_id_offers_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.merchantId],
			foreignColumns: [merchants.merchantId],
			name: "offer_stats_merchant_id_merchants_merchant_id_fk"
		}).onDelete("cascade"),
]);

export const suggestions = pgTable("suggestions", {
	id: serial().primaryKey().notNull(),
	merchantId: integer("merchant_id").notNull(),
	userId: integer("user_id"),
	title: varchar({ length: 160 }).notNull(),
	body: text().notNull(),
	status: suggestionStatus().default('new').notNull(),
	adminNote: text("admin_note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("suggestions_merchant_created_idx").using("btree", table.merchantId.asc().nullsLast().op("int4_ops"), table.createdAt.asc().nullsLast().op("int4_ops")),
	index("suggestions_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.merchantId],
			foreignColumns: [merchants.merchantId],
			name: "suggestions_merchant_id_merchants_merchant_id_fk"
		}).onDelete("cascade"),
]);

export const addonOfferSettings = pgTable("addon_offer_settings", {
	offerId: integer("offer_id").primaryKey().notNull(),
	maxItems: integer("max_items").default(8).notNull(),
	productsPreselectedByDefault: boolean("products_preselected_by_default").default(false).notNull(),
	showProductOptions: boolean("show_product_options").default(false).notNull(),
	displayOrientation: displayOrientation("display_orientation").default('horizontal').notNull(),
	discountType: addonDiscountType("discount_type"),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }),
	positionDesktop: varchar("position_desktop", { length: 50 }),
	positionMobile: varchar("position_mobile", { length: 50 }),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "addon_offer_settings_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const bundleOfferSettings = pgTable("bundle_offer_settings", {
	offerId: integer("offer_id").primaryKey().notNull(),
	discountType: bundleDiscountType("discount_type"),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "bundle_offer_settings_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const offerTargets = pgTable("offer_targets", {
	id: serial().primaryKey().notNull(),
	offerId: integer("offer_id").notNull(),
	entityType: offerTargetEntity("entity_type").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sallaEntityId: bigint("salla_entity_id", { mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "offer_targets_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const upgradeOfferSettings = pgTable("upgrade_offer_settings", {
	offerId: integer("offer_id").primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	baseSallaProductId: bigint("base_salla_product_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	upgradeSallaProductId: bigint("upgrade_salla_product_id", { mode: "number" }).notNull(),
	couponCode: varchar("coupon_code", { length: 64 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sallaCouponId: bigint("salla_coupon_id", { mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "upgrade_offer_settings_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const offers = pgTable("offers", {
	id: serial().primaryKey().notNull(),
	merchantId: integer("merchant_id").notNull(),
	kind: offerKind().notNull(),
	internalName: varchar("internal_name", { length: 255 }).notNull(),
	title: jsonb().notNull(),
	subtitle: jsonb(),
	targetType: targetType("target_type").default('selected_products').notNull(),
	expiryDate: timestamp("expiry_date", { withTimezone: true, mode: 'string' }),
	status: offerStatus().default('draft').notNull(),
	redirectToCartAfterAdd: boolean("redirect_to_cart_after_add").default(false).notNull(),
	hideSallaPopup: boolean("hide_salla_popup").default(true).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sallaOfferId: bigint("salla_offer_id", { mode: "number" }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.merchantId],
			foreignColumns: [merchants.merchantId],
			name: "offers_merchant_id_merchants_merchant_id_fk"
		}).onDelete("cascade"),
]);

export const offerAppearance = pgTable("offer_appearance", {
	offerId: integer("offer_id").primaryKey().notNull(),
	borderRadiusPx: integer("border_radius_px").default(0).notNull(),
	colors: jsonb().default({}).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "offer_appearance_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const offerRelatedProducts = pgTable("offer_related_products", {
	id: serial().primaryKey().notNull(),
	offerId: integer("offer_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sallaProductId: bigint("salla_product_id", { mode: "number" }).notNull(),
	position: integer().default(0).notNull(),
	isPreselected: boolean("is_preselected").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "offer_related_products_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const quantityOfferSettings = pgTable("quantity_offer_settings", {
	offerId: integer("offer_id").primaryKey().notNull(),
	allowDifferentOptionsPerPiece: boolean("allow_different_options_per_piece").default(false).notNull(),
	hideThemeDefaultOptions: boolean("hide_theme_default_options").default(false).notNull(),
	showPricePerPiece: boolean("show_price_per_piece").default(false).notNull(),
	roundPriceToNearestInteger: boolean("round_price_to_nearest_integer").default(false).notNull(),
	applyEvenWithCoupon: boolean("apply_even_with_coupon").default(true).notNull(),
	hideQuantityField: boolean("hide_quantity_field").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "quantity_offer_settings_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const quantityOfferTiers = pgTable("quantity_offer_tiers", {
	id: serial().primaryKey().notNull(),
	offerId: integer("offer_id").notNull(),
	position: integer().default(0).notNull(),
	quantity: integer().notNull(),
	mainTitle: jsonb("main_title").notNull(),
	subtitle: jsonb(),
	pricingType: pricingType("pricing_type").notNull(),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }).notNull(),
	isSelectedByDefault: boolean("is_selected_by_default").default(false).notNull(),
	badgeText: varchar("badge_text", { length: 100 }),
	labelText: varchar("label_text", { length: 100 }),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "quantity_offer_tiers_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const recommendationOfferSettings = pgTable("recommendation_offer_settings", {
	offerId: integer("offer_id").primaryKey().notNull(),
	mode: recommendationMode().default('general').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	triggerSallaProductId: bigint("trigger_salla_product_id", { mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.offerId],
			foreignColumns: [offers.id],
			name: "recommendation_offer_settings_offer_id_offers_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const merchants = pgTable("merchants", {
	id: serial().primaryKey().notNull(),
	merchantId: integer("merchant_id").notNull(),
	accessToken: varchar("access_token", { length: 255 }).notNull(),
	refreshToken: varchar("refresh_token", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("merchants_merchant_id_unique").on(table.merchantId),
]);

export const eventLogs = pgTable("event_logs", {
	id: serial().primaryKey().notNull(),
	eventName: text("event_name").notNull(),
	eventData: jsonb("event_data").notNull(),
	eventDate: timestamp("event_date", { mode: 'string' }).defaultNow().notNull(),
	merchantId: integer("merchant_id").notNull(),
}, (table) => [
	index("event_logs_merchant_date_idx").using("btree", table.merchantId.asc().nullsLast().op("int4_ops"), table.eventDate.asc().nullsLast().op("int4_ops")),
]);

export const dailyStats = pgTable("daily_stats", {
	merchantId: integer("merchant_id").notNull(),
	date: date().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	impressions: bigint({ mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clicks: bigint({ mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	addToCart: bigint("add_to_cart", { mode: "number" }).default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	conversions: bigint({ mode: "number" }).default(0).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.merchantId],
			foreignColumns: [merchants.merchantId],
			name: "daily_stats_merchant_id_merchants_merchant_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.merchantId, table.date], name: "daily_stats_pk"}),
]);
