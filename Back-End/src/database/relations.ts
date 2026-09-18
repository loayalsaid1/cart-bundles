import { relations } from 'drizzle-orm';
import { activityLogs, dailyStats, offerStats } from './entities/activity-logs';
import { merchants } from './entities/merchants';
import { suggestions } from './entities/suggestions';
import { users } from './entities/users';
import {
  offers,
  offerTargets,
  offerRelatedProducts,
  offerAppearance,
  quantityOfferSettings,
  quantityOfferTiers,
  addonOfferSettings,
  bundleOfferSettings,
  upgradeOfferSettings,
  recommendationOfferSettings,
} from './entities/offers';

export const usersRelations = relations(users, () => ({}));

export const merchantsRelations = relations(merchants, ({ many }) => ({
  offers: many(offers),
  activityLogs: many(activityLogs),
  offerStats: many(offerStats),
  dailyStats: many(dailyStats),
  suggestions: many(suggestions),
}));

export const suggestionsRelations = relations(suggestions, ({ one }) => ({
  merchant: one(merchants, {
    fields: [suggestions.merchantId],
    references: [merchants.merchantId],
  }),
}));

export const offersRelations = relations(offers, ({ many, one }) => ({
  merchant: one(merchants, {
    fields: [offers.merchantId],
    references: [merchants.merchantId],
  }),
  targets: many(offerTargets),
  relatedProducts: many(offerRelatedProducts),
  appearance: one(offerAppearance, {
    fields: [offers.id],
    references: [offerAppearance.offerId],
  }),
  quantitySettings: one(quantityOfferSettings, {
    fields: [offers.id],
    references: [quantityOfferSettings.offerId],
  }),
  quantityTiers: many(quantityOfferTiers),
  addonSettings: one(addonOfferSettings, {
    fields: [offers.id],
    references: [addonOfferSettings.offerId],
  }),
  bundleSettings: one(bundleOfferSettings, {
    fields: [offers.id],
    references: [bundleOfferSettings.offerId],
  }),
  upgradeSettings: one(upgradeOfferSettings, {
    fields: [offers.id],
    references: [upgradeOfferSettings.offerId],
  }),
  recommendationSettings: one(recommendationOfferSettings, {
    fields: [offers.id],
    references: [recommendationOfferSettings.offerId],
  }),
  stats: one(offerStats, {
    fields: [offers.id],
    references: [offerStats.offerId],
  }),
  activityLogs: many(activityLogs),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  merchant: one(merchants, {
    fields: [activityLogs.merchantId],
    references: [merchants.merchantId],
  }),
  offer: one(offers, {
    fields: [activityLogs.offerId],
    references: [offers.id],
  }),
}));

export const offerStatsRelations = relations(offerStats, ({ one }) => ({
  merchant: one(merchants, {
    fields: [offerStats.merchantId],
    references: [merchants.merchantId],
  }),
  offer: one(offers, {
    fields: [offerStats.offerId],
    references: [offers.id],
  }),
}));

export const dailyStatsRelations = relations(dailyStats, ({ one }) => ({
  merchant: one(merchants, {
    fields: [dailyStats.merchantId],
    references: [merchants.merchantId],
  }),
}));

export const offerTargetsRelations = relations(offerTargets, ({ one }) => ({
  offer: one(offers, {
    fields: [offerTargets.offerId],
    references: [offers.id],
  }),
}));

export const offerRelatedProductsRelations = relations(
  offerRelatedProducts,
  ({ one }) => ({
    offer: one(offers, {
      fields: [offerRelatedProducts.offerId],
      references: [offers.id],
    }),
  }),
);

export const offerAppearanceRelations = relations(
  offerAppearance,
  ({ one }) => ({
    offer: one(offers, {
      fields: [offerAppearance.offerId],
      references: [offers.id],
    }),
  }),
);

export const quantityOfferSettingsRelations = relations(
  quantityOfferSettings,
  ({ one }) => ({
    offer: one(offers, {
      fields: [quantityOfferSettings.offerId],
      references: [offers.id],
    }),
  }),
);

export const quantityOfferTiersRelations = relations(
  quantityOfferTiers,
  ({ one }) => ({
    offer: one(offers, {
      fields: [quantityOfferTiers.offerId],
      references: [offers.id],
    }),
  }),
);

export const addonOfferSettingsRelations = relations(
  addonOfferSettings,
  ({ one }) => ({
    offer: one(offers, {
      fields: [addonOfferSettings.offerId],
      references: [offers.id],
    }),
  }),
);

export const bundleOfferSettingsRelations = relations(
  bundleOfferSettings,
  ({ one }) => ({
    offer: one(offers, {
      fields: [bundleOfferSettings.offerId],
      references: [offers.id],
    }),
  }),
);

export const upgradeOfferSettingsRelations = relations(
  upgradeOfferSettings,
  ({ one }) => ({
    offer: one(offers, {
      fields: [upgradeOfferSettings.offerId],
      references: [offers.id],
    }),
  }),
);

export const recommendationOfferSettingsRelations = relations(
  recommendationOfferSettings,
  ({ one }) => ({
    offer: one(offers, {
      fields: [recommendationOfferSettings.offerId],
      references: [offers.id],
    }),
  }),
);
