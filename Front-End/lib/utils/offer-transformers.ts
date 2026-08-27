import type { QuantityOfferDraft, QuantityOfferFull } from '@/lib/schemas/quantity-offer';

function toDateInput(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

export function fullOfferToQuantityDraft(offer: QuantityOfferFull): QuantityOfferDraft {
  const settings = offer.quantitySettings;
  return {
    info: {
      internalName: offer.internalName,
      title: {
        ar: offer.title.ar ?? '',
        en: offer.title.en,
      },
      subtitle: offer.subtitle
        ? { ar: offer.subtitle.ar, en: offer.subtitle.en }
        : undefined,
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
          mainTitle: { ar: t.mainTitle.ar ?? '', en: t.mainTitle.en },
          subtitle: t.subtitle ? { ar: t.subtitle.ar, en: t.subtitle.en } : undefined,
          pricingType: t.pricingType,
          discountAmount: t.discountAmount,
          isSelectedByDefault: t.isSelectedByDefault,
          badgeText: t.badgeText ?? undefined,
          labelText: t.labelText ?? undefined,
        })),
    },
    appearance: offer.appearance
      ? {
          borderRadiusPx: offer.appearance.borderRadiusPx,
          colors: offer.appearance.colors,
        }
      : undefined,
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
