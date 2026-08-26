import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
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
} from '../../../database/schema';

export type Offer = InferSelectModel<typeof offers>;
export type NewOffer = InferInsertModel<typeof offers>;

export type OfferTarget = InferSelectModel<typeof offerTargets>;
export type OfferRelatedProduct = InferSelectModel<typeof offerRelatedProducts>;
export type OfferAppearance = InferSelectModel<typeof offerAppearance>;

export type QuantityOfferSettings = InferSelectModel<typeof quantityOfferSettings>;
export type QuantityOfferTier = InferSelectModel<typeof quantityOfferTiers>;

export type AddonOfferSettings = InferSelectModel<typeof addonOfferSettings>;
export type BundleOfferSettings = InferSelectModel<typeof bundleOfferSettings>;
export type UpgradeOfferSettings = InferSelectModel<typeof upgradeOfferSettings>;
export type RecommendationOfferSettings = InferSelectModel<typeof recommendationOfferSettings>;

export interface QuantityOfferFull extends Offer {
  targets: OfferTarget[];
  quantitySettings: QuantityOfferSettings | null;
  quantityTiers: QuantityOfferTier[];
  appearance: OfferAppearance | null;
}

export interface AddonOfferFull extends Offer {
  targets: OfferTarget[];
  relatedProducts: OfferRelatedProduct[];
  addonSettings: AddonOfferSettings | null;
  appearance: OfferAppearance | null;
}

export interface BundleOfferFull extends Offer {
  targets: OfferTarget[];
  relatedProducts: OfferRelatedProduct[];
  bundleSettings: BundleOfferSettings | null;
  appearance: OfferAppearance | null;
}

export interface UpgradeOfferFull extends Offer {
  targets: OfferTarget[];
  upgradeSettings: UpgradeOfferSettings | null;
}

export interface RecommendationOfferFull extends Offer {
  relatedProducts: OfferRelatedProduct[];
  recommendationSettings: RecommendationOfferSettings | null;
}

export interface FullOffer extends Offer {
  targets: OfferTarget[];
  relatedProducts: OfferRelatedProduct[];
  appearance: OfferAppearance | null;
  quantitySettings: QuantityOfferSettings | null;
  quantityTiers: QuantityOfferTier[];
  addonSettings: AddonOfferSettings | null;
  bundleSettings: BundleOfferSettings | null;
  upgradeSettings: UpgradeOfferSettings | null;
  recommendationSettings: RecommendationOfferSettings | null;
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; reason: 'not_found'; error?: string }
  | { success: false; reason: 'salla_sync_failed'; error: string }
  | { success: false; reason: 'validation_error'; error: string };
