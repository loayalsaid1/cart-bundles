import { relations } from "drizzle-orm/relations";
import { merchants, activityLogs, offers, offerStats, suggestions, addonOfferSettings, bundleOfferSettings, offerTargets, upgradeOfferSettings, offerAppearance, offerRelatedProducts, quantityOfferSettings, quantityOfferTiers, recommendationOfferSettings, dailyStats } from "./schema";

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	merchant: one(merchants, {
		fields: [activityLogs.merchantId],
		references: [merchants.merchantId]
	}),
	offer: one(offers, {
		fields: [activityLogs.offerId],
		references: [offers.id]
	}),
}));

export const merchantsRelations = relations(merchants, ({many}) => ({
	activityLogs: many(activityLogs),
	offerStats: many(offerStats),
	suggestions: many(suggestions),
	offers: many(offers),
	dailyStats: many(dailyStats),
}));

export const offersRelations = relations(offers, ({one, many}) => ({
	activityLogs: many(activityLogs),
	offerStats: many(offerStats),
	addonOfferSettings: many(addonOfferSettings),
	bundleOfferSettings: many(bundleOfferSettings),
	offerTargets: many(offerTargets),
	upgradeOfferSettings: many(upgradeOfferSettings),
	merchant: one(merchants, {
		fields: [offers.merchantId],
		references: [merchants.merchantId]
	}),
	offerAppearances: many(offerAppearance),
	offerRelatedProducts: many(offerRelatedProducts),
	quantityOfferSettings: many(quantityOfferSettings),
	quantityOfferTiers: many(quantityOfferTiers),
	recommendationOfferSettings: many(recommendationOfferSettings),
}));

export const offerStatsRelations = relations(offerStats, ({one}) => ({
	offer: one(offers, {
		fields: [offerStats.offerId],
		references: [offers.id]
	}),
	merchant: one(merchants, {
		fields: [offerStats.merchantId],
		references: [merchants.merchantId]
	}),
}));

export const suggestionsRelations = relations(suggestions, ({one}) => ({
	merchant: one(merchants, {
		fields: [suggestions.merchantId],
		references: [merchants.merchantId]
	}),
}));

export const addonOfferSettingsRelations = relations(addonOfferSettings, ({one}) => ({
	offer: one(offers, {
		fields: [addonOfferSettings.offerId],
		references: [offers.id]
	}),
}));

export const bundleOfferSettingsRelations = relations(bundleOfferSettings, ({one}) => ({
	offer: one(offers, {
		fields: [bundleOfferSettings.offerId],
		references: [offers.id]
	}),
}));

export const offerTargetsRelations = relations(offerTargets, ({one}) => ({
	offer: one(offers, {
		fields: [offerTargets.offerId],
		references: [offers.id]
	}),
}));

export const upgradeOfferSettingsRelations = relations(upgradeOfferSettings, ({one}) => ({
	offer: one(offers, {
		fields: [upgradeOfferSettings.offerId],
		references: [offers.id]
	}),
}));

export const offerAppearanceRelations = relations(offerAppearance, ({one}) => ({
	offer: one(offers, {
		fields: [offerAppearance.offerId],
		references: [offers.id]
	}),
}));

export const offerRelatedProductsRelations = relations(offerRelatedProducts, ({one}) => ({
	offer: one(offers, {
		fields: [offerRelatedProducts.offerId],
		references: [offers.id]
	}),
}));

export const quantityOfferSettingsRelations = relations(quantityOfferSettings, ({one}) => ({
	offer: one(offers, {
		fields: [quantityOfferSettings.offerId],
		references: [offers.id]
	}),
}));

export const quantityOfferTiersRelations = relations(quantityOfferTiers, ({one}) => ({
	offer: one(offers, {
		fields: [quantityOfferTiers.offerId],
		references: [offers.id]
	}),
}));

export const recommendationOfferSettingsRelations = relations(recommendationOfferSettings, ({one}) => ({
	offer: one(offers, {
		fields: [recommendationOfferSettings.offerId],
		references: [offers.id]
	}),
}));

export const dailyStatsRelations = relations(dailyStats, ({one}) => ({
	merchant: one(merchants, {
		fields: [dailyStats.merchantId],
		references: [merchants.merchantId]
	}),
}));