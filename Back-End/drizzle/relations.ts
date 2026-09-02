import { relations } from "drizzle-orm/relations";
import { offers, addonOfferSettings, bundleOfferSettings, offerTargets, upgradeOfferSettings, merchants, offerAppearance, offerRelatedProducts, quantityOfferSettings, quantityOfferTiers, recommendationOfferSettings } from "./schema";

export const addonOfferSettingsRelations = relations(addonOfferSettings, ({one}) => ({
	offer: one(offers, {
		fields: [addonOfferSettings.offerId],
		references: [offers.id]
	}),
}));

export const offersRelations = relations(offers, ({one, many}) => ({
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

export const merchantsRelations = relations(merchants, ({many}) => ({
	offers: many(offers),
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