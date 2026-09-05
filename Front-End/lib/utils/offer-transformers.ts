import type { QuantityOfferDraft, QuantityOfferFull } from '@/lib/schemas/quantity-offer';
import type { AddonOfferDraft, AddonOfferFull } from '@/lib/schemas/addon-offer';
import type { BundleOfferDraft, BundleOfferFull } from '@/lib/schemas/bundle-offer';
import type { UpgradeOfferDraft, UpgradeOfferFull } from '@/lib/schemas/upgrade-offer';
import type { RecommendationOfferDraft, RecommendationOfferFull } from '@/lib/schemas/recommendation-offer';
import type { OfferAppearance } from '@/lib/schemas/common-offer';

function toDateInput(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function toLocaleText(title: Record<string, string>): { ar: string; en?: string } {
  return { ar: title.ar ?? '', en: title.en };
}

function toOptionalLocaleText(
  subtitle?: Record<string, string> | null,
): { ar?: string; en?: string } | undefined {
  if (!subtitle) return undefined;
  return { ar: subtitle.ar, en: subtitle.en };
}

function toAppearance(
  appearance?: { borderRadiusPx?: number | null; colors?: Record<string, string> | null } | null,
): OfferAppearance | undefined {
  if (!appearance) return undefined;
  return {
    borderRadiusPx: appearance.borderRadiusPx ?? undefined,
    colors: appearance.colors ?? undefined,
  };
}

export function fullOfferToQuantityDraft(offer: QuantityOfferFull): QuantityOfferDraft {
  const settings = offer.quantitySettings;
  return {
    info: {
      internalName: offer.internalName,
      title: toLocaleText(offer.title),
      subtitle: toOptionalLocaleText(offer.subtitle),
      expiryDate: toDateInput(offer.expiryDate),
    },
    targeting: {
      type: offer.targetType,
      ids: offer.targets.map((t) => t.sallaEntityId),
    },
    settings: {
      redirectToCartAfterAdd: offer.redirectToCartAfterAdd,
      hideSallaPopup: offer.hideSallaPopup,
      allowDifferentOptionsPerPiece: settings?.allowDifferentOptionsPerPiece,
      hideThemeDefaultOptions: settings?.hideThemeDefaultOptions,
      showPricePerPiece: settings?.showPricePerPiece,
      roundPriceToNearestInteger: settings?.roundPriceToNearestInteger,
      applyEvenWithCoupon: settings?.applyEvenWithCoupon,
      hideQuantityField: settings?.hideQuantityField,
      tiers: [...offer.quantityTiers]
        .sort((a, b) => a.position - b.position)
        .map((t) => ({
          quantity: t.quantity,
          mainTitle: toLocaleText(t.mainTitle),
          subtitle: toOptionalLocaleText(t.subtitle),
          pricingType: t.pricingType,
          discountAmount: t.discountAmount,
          isSelectedByDefault: t.isSelectedByDefault,
          badgeText: t.badgeText ?? undefined,
          labelText: t.labelText ?? undefined,
        })),
    },
    appearance: toAppearance(offer.appearance),
  };
}

export const defaultQuantityDraft: QuantityOfferDraft = {
  info: {
    internalName: '',
    title: { ar: '', en: '' },
    subtitle: { ar: '', en: '' },
    expiryDate: undefined,
  },
  targeting: { type: 'all_products', ids: [] },
  settings: {
    redirectToCartAfterAdd: false,
    hideSallaPopup: true,
    allowDifferentOptionsPerPiece: false,
    hideThemeDefaultOptions: false,
    showPricePerPiece: false,
    roundPriceToNearestInteger: false,
    applyEvenWithCoupon: true,
    hideQuantityField: false,
    tiers: [
      {
        quantity: 2,
        mainTitle: { ar: 'عرض قطعتين', en: 'Buy 2' },
        subtitle: { ar: '', en: '' },
        pricingType: 'percentage',
        discountAmount: 10,
        isSelectedByDefault: true,
        badgeText: '',
        labelText: '',
      },
    ],
  },
  appearance: {
    borderRadiusPx: 12,
    colors: {
      cardBg: '#ffffff',
      cardBorder: '#e5e7eb',
      selectedTier: '#f0fdf4',
      badgeBg: '#004b40',
      badgeText: '#ffffff',
      savings: '#16a34a',
    },
  },
};

export const APPEARANCE_PRESETS = [
  {
    id: 'forest',
    colors: {
      cardBg: '#ffffff',
      cardBorder: '#d1fae5',
      selectedTier: '#f0fdf4',
      badgeBg: '#059669',
      badgeText: '#ffffff',
      savings: '#047857',
    },
  },
  {
    id: 'sand',
    colors: {
      cardBg: '#fffbeb',
      cardBorder: '#fde68a',
      selectedTier: '#fef3c7',
      badgeBg: '#d97706',
      badgeText: '#ffffff',
      savings: '#b45309',
    },
  },
  {
    id: 'night',
    colors: {
      cardBg: '#111827',
      cardBorder: '#374151',
      selectedTier: '#1e1b4b',
      badgeBg: '#f43f5e',
      badgeText: '#ffffff',
      savings: '#34d399',
    },
  },
] as const;

const DEFAULT_APPEARANCE: OfferAppearance = {
  borderRadiusPx: 12,
  colors: {
    cardBg: '#ffffff',
    cardBorder: '#e5e7eb',
    selectedTier: '#f0fdf4',
    badgeBg: '#004b40',
    badgeText: '#ffffff',
    savings: '#16a34a',
  },
};

function defaultInfo() {
  return {
    internalName: '',
    title: { ar: '', en: '' },
    subtitle: { ar: '', en: '' },
    expiryDate: undefined,
  };
}

function defaultTargeting() {
  return { type: 'all_products' as const, ids: [] as number[] };
}

export function fullOfferToAddonDraft(offer: AddonOfferFull): AddonOfferDraft {
  const settings = offer.addonSettings;
  return {
    info: {
      internalName: offer.internalName,
      title: toLocaleText(offer.title),
      subtitle: toOptionalLocaleText(offer.subtitle),
      expiryDate: toDateInput(offer.expiryDate),
    },
    targeting: {
      type: offer.targetType,
      ids: offer.targets.map((t) => t.sallaEntityId),
    },
    settings: {
      redirectToCartAfterAdd: offer.redirectToCartAfterAdd,
      hideSallaPopup: offer.hideSallaPopup,
      maxItems: settings?.maxItems ?? undefined,
      productsPreselectedByDefault: settings?.productsPreselectedByDefault,
      showProductOptions: settings?.showProductOptions,
      displayOrientation: settings?.displayOrientation ?? undefined,
      discountType: settings?.discountType ?? undefined,
      discountAmount: settings?.discountAmount ?? undefined,
      positionDesktop: settings?.positionDesktop ?? undefined,
      positionMobile: settings?.positionMobile ?? undefined,
      relatedProducts: [...offer.relatedProducts]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({
          sallaProductId: p.sallaProductId,
          position: p.position,
          isPreselected: p.isPreselected,
        })),
    },
    appearance: toAppearance(offer.appearance),
  };
}

export const defaultAddonDraft: AddonOfferDraft = {
  info: defaultInfo(),
  targeting: { type: 'selected_products', ids: [] },
  settings: {
    redirectToCartAfterAdd: false,
    hideSallaPopup: true,
    maxItems: 4,
    productsPreselectedByDefault: false,
    showProductOptions: false,
    displayOrientation: 'horizontal',
    discountType: undefined,
    discountAmount: undefined,
    positionDesktop: 'after_add_to_cart',
    positionMobile: 'after_add_to_cart',
    relatedProducts: [],
  },
  appearance: DEFAULT_APPEARANCE,
};

export function fullOfferToBundleDraft(offer: BundleOfferFull): BundleOfferDraft {
  const settings = offer.bundleSettings;
  return {
    info: {
      internalName: offer.internalName,
      title: toLocaleText(offer.title),
      subtitle: toOptionalLocaleText(offer.subtitle),
      expiryDate: toDateInput(offer.expiryDate),
    },
    targeting: {
      type: 'selected_products',
      ids: offer.targets.map((t) => t.sallaEntityId).slice(0, 1),
    },
    settings: {
      redirectToCartAfterAdd: offer.redirectToCartAfterAdd,
      hideSallaPopup: offer.hideSallaPopup,
      discountType: settings?.discountType ?? undefined,
      discountAmount: settings?.discountAmount ?? undefined,
      relatedProducts: [...offer.relatedProducts]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({
          sallaProductId: p.sallaProductId,
          position: p.position,
          isPreselected: p.isPreselected,
        })),
    },
    appearance: toAppearance(offer.appearance),
  };
}

export const defaultBundleDraft: BundleOfferDraft = {
  info: defaultInfo(),
  targeting: { type: 'selected_products', ids: [] },
  settings: {
    redirectToCartAfterAdd: false,
    hideSallaPopup: true,
    discountType: undefined,
    discountAmount: undefined,
    relatedProducts: [],
  },
  appearance: DEFAULT_APPEARANCE,
};

export function fullOfferToUpgradeDraft(offer: UpgradeOfferFull): UpgradeOfferDraft {
  const settings = offer.upgradeSettings;
  return {
    info: {
      internalName: offer.internalName,
      title: toLocaleText(offer.title),
      subtitle: toOptionalLocaleText(offer.subtitle),
      expiryDate: toDateInput(offer.expiryDate),
    },
    targeting: {
      type: offer.targetType,
      ids: offer.targets.map((t) => t.sallaEntityId),
    },
    settings: {
      redirectToCartAfterAdd: offer.redirectToCartAfterAdd,
      hideSallaPopup: offer.hideSallaPopup,
      baseSallaProductId: settings?.baseSallaProductId ?? 0,
      upgradeSallaProductId: settings?.upgradeSallaProductId ?? 0,
      couponCode: settings?.couponCode ?? undefined,
    },
    appearance: toAppearance(offer.appearance),
  };
}

export const defaultUpgradeDraft: UpgradeOfferDraft = {
  info: defaultInfo(),
  targeting: defaultTargeting(),
  settings: {
    redirectToCartAfterAdd: false,
    hideSallaPopup: true,
    baseSallaProductId: 0,
    upgradeSallaProductId: 0,
    couponCode: '',
  },
  appearance: DEFAULT_APPEARANCE,
};

export function fullOfferToRecommendationDraft(
  offer: RecommendationOfferFull,
): RecommendationOfferDraft {
  const settings = offer.recommendationSettings;
  return {
    info: {
      internalName: offer.internalName,
      title: toLocaleText(offer.title),
      subtitle: toOptionalLocaleText(offer.subtitle),
      expiryDate: toDateInput(offer.expiryDate),
    },
    settings: {
      mode: settings?.mode ?? 'general',
      triggerSallaProductId: settings?.triggerSallaProductId ?? undefined,
      relatedProducts: [...offer.relatedProducts]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({
          sallaProductId: p.sallaProductId,
          position: p.position,
          isPreselected: p.isPreselected,
        })),
    },
    appearance: toAppearance(offer.appearance),
  };
}

export const defaultRecommendationDraft: RecommendationOfferDraft = {
  info: defaultInfo(),
  settings: {
    mode: 'general',
    triggerSallaProductId: undefined,
    relatedProducts: [],
  },
  appearance: DEFAULT_APPEARANCE,
};
