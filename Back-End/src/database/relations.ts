import { relations } from 'drizzle-orm';
import {
  users,
  merchants,
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
} from './schema';

export const usersRelations = relations(users, () => ({}));

export const merchantsRelations = relations(merchants, ({ many }) => ({
  offers: many(offers),
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
