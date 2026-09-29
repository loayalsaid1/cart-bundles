import type { QuantityOfferDraft, QuantityOfferFull } from '@/lib/schemas/quantity-offer';
import type { AddonOfferDraft, AddonOfferFull } from '@/lib/schemas/addon-offer';
import type { BundleOfferDraft, BundleOfferFull } from '@/lib/schemas/bundle-offer';
import type { UpgradeOfferDraft, UpgradeOfferFull } from '@/lib/schemas/upgrade-offer';
import type { RecommendationOfferDraft, RecommendationOfferFull } from '@/lib/schemas/recommendation-offer';
import type { OfferAppearance } from '@/lib/schemas/common-offer';
import { isStartFrozen, toRiyadhCalendarDate } from '@/lib/utils/riyadh-date';

function toDateInput(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return toRiyadhCalendarDate(d);
}

function toStartInfo(startDate?: string | null): {
  startNow: boolean;
  startDate?: string;
  startFrozen?: boolean;
} {
  if (!startDate) return { startNow: true };
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return { startNow: true };
  if (isStartFrozen(d)) {
    return { startNow: false, startDate: toRiyadhCalendarDate(d), startFrozen: true };
  }
  const cal = toRiyadhCalendarDate(d);
  const midnight = new Date(`${cal}T00:00:00.000+03:00`);
  if (d.getTime() === midnight.getTime()) {
    return { startNow: false, startDate: cal };
  }
  return { startNow: true };
}

function toLocaleText(title: Record<string, string>): { ar: string; en?: string } {
  return { ar: title.ar ?? '', en: title.en };
}

function toOptionalLocaleText(
  subtitle?: Record<string, string> | string | null,
): { ar?: string; en?: string } | undefined {
  if (!subtitle) return undefined;
  if (typeof subtitle === 'string') return { ar: subtitle, en: subtitle };
  return { ar: subtitle.ar, en: subtitle.en };
}

function toAppearance(
  appearance?: {
    borderRadiusPx?: number | null;
    colors?: Record<string, string> | null;
    titleAlign?: 'start' | 'center' | 'end' | null;
    showBorder?: boolean | null;
    shadow?: 'none' | 'sm' | 'md' | 'lg' | null;
  } | null,
): OfferAppearance | undefined {
  if (!appearance) return undefined;
  return {
    borderRadiusPx: appearance.borderRadiusPx ?? undefined,
    colors: appearance.colors ?? undefined,
    titleAlign: appearance.titleAlign ?? 'start',
    showBorder: appearance.showBorder ?? true,
    shadow: appearance.shadow ?? 'sm',
  };
}

export function fullOfferToQuantityDraft(offer: QuantityOfferFull): QuantityOfferDraft {
  const settings = offer.quantitySettings;
  return {
    info: {
      internalName: offer.internalName,
      title: toLocaleText(offer.title),
      subtitle: toOptionalLocaleText(offer.subtitle),
      ...toStartInfo(offer.startDate),
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
          badgeText: toOptionalLocaleText(t.badgeText) ?? { ar: '', en: '' },
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
    startNow: true,
    startDate: undefined,
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
        badgeText: { ar: '', en: '' },
        labelText: '',
      },
    ],
  },
  appearance: {
    borderRadiusPx: 12,
    titleAlign: 'start',
    showBorder: true,
    shadow: 'sm',
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
  titleAlign: 'start',
  showBorder: true,
  shadow: 'sm',
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
    startNow: true,
    startDate: undefined,
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
      ...toStartInfo(offer.startDate),
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
      ...toStartInfo(offer.startDate),
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
      ...toStartInfo(offer.startDate),
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
      sallaCouponId: settings?.sallaCouponId ?? undefined,
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
      ...toStartInfo(offer.startDate),
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
