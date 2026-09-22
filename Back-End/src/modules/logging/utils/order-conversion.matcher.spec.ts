import {
  extractOrderId,
  extractOrderStatus,
  extractProductAmounts,
  extractProductQuantities,
  matchOffers,
  type ConversionOffer,
  type MatchContext,
} from './order-conversion.matcher';
import type { SallaOrderData } from '../../webhooks/types/salla-events';

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

describe('order-conversion extraction helpers', () => {
  it('reads nested Salla order ids and line items strictly', () => {
    const payload: Partial<SallaOrderData> = {
      id: 2116149737,
      status: { id: 1, name: 'Under Review', slug: 'in_progress' },
      items: [
        { id: 1, name: '', sku: '', quantity: 3, product: { id: 10, type: 'product', name: '', sku: '' } },
        { id: 2, name: '', sku: '', quantity: 1, product: { id: 20, type: 'product', name: '', sku: '' } },
      ],
    };

    expect(extractOrderId(payload as SallaOrderData)).toBe(2116149737);
    expect(extractOrderStatus(payload as SallaOrderData)).toBe('in_progress');
    expect(extractProductQuantities(payload as SallaOrderData)).toEqual(
      new Map([
        [10, 3],
        [20, 1],
      ]),
    );
  });

  it('extracts product line amounts using total and price_without_tax fallbacks', () => {
    const payload: Partial<SallaOrderData> = {
      items: [
        {
          id: 1, name: '', sku: '', quantity: 2,
          amounts: { total: { amount: 150.5 } },
          product: { id: 10, type: 'product', name: '', sku: '' },
        },
        {
          id: 2, name: '', sku: '', quantity: 1,
          amounts: { price_without_tax: { amount: 50.0 } },
          product: { id: 10, type: 'product', name: '', sku: '' },
        },
        {
          id: 3, name: '', sku: '', quantity: 1,
          amounts: {},
          product: { id: 20, type: 'product', name: '', sku: '' },
        },
      ],
    };

    expect(extractProductAmounts(payload as SallaOrderData)).toEqual(
      new Map([
        [10, 200.5],
        [20, 0],
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// matchOffers — product-target offers
// ---------------------------------------------------------------------------

describe('matchOffers — product targets', () => {
  const base = {
    categoryIds: [],
    quantityTiers: [],
    upgradeSettings: null,
    recommendationSettings: null,
  };

  const offers: ConversionOffer[] = [
    {
      ...base,
      id: 1, kind: 'quantity_discount', targetType: 'selected_products',
      targets: [{ entityType: 'product', sallaEntityId: 10 }],
      relatedProducts: [],
      quantityTiers: [{ quantity: 2 }],
    },
    {
      ...base,
      id: 2, kind: 'product_add_on', targetType: 'selected_products',
      targets: [{ entityType: 'product', sallaEntityId: 10 }],
      relatedProducts: [{ sallaProductId: 99 }],
    },
    {
      ...base,
      id: 3, kind: 'bundle', targetType: 'selected_products',
      targets: [{ entityType: 'product', sallaEntityId: 10 }],
      relatedProducts: [{ sallaProductId: 30 }, { sallaProductId: 31 }],
    },
    {
      ...base,
      id: 4, kind: 'upgrade_offer', targetType: 'selected_products',
      targets: [],
      relatedProducts: [],
      upgradeSettings: { upgradeSallaProductId: 40 },
    },
    {
      ...base,
      id: 5, kind: 'cart_recommendation', targetType: 'all_products',
      targets: [],
      relatedProducts: [{ sallaProductId: 50 }],
      recommendationSettings: { mode: 'cart_related', triggerSallaProductId: 10 },
    },
  ];

  it('matches all offer types when all products are present', () => {
    const matched = matchOffers(
      offers,
      new Map([[10, 3], [30, 1], [31, 1], [40, 1], [50, 1], [99, 1]]),
    );
    expect(matched.map((o) => o.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not match quantity offer when qty is below minimum', () => {
    const matched = matchOffers(
      offers,
      new Map([[10, 1], [30, 1], [31, 1], [40, 1], [50, 1], [99, 1]]),
    );
    expect(matched.map((o) => o.id)).not.toContain(1);
  });

  it('does not match bundle when a required related product is missing', () => {
    const matched = matchOffers(
      offers,
      new Map([[10, 3], [30, 1], [40, 1], [50, 1], [99, 1]]), // missing 31
    );
    expect(matched.map((o) => o.id)).not.toContain(3);
  });
});

// ---------------------------------------------------------------------------
// matchOffers — category targets
// ---------------------------------------------------------------------------

describe('matchOffers — category targets', () => {
  const categoryOffer: ConversionOffer = {
    id: 10,
    kind: 'product_add_on',
    targetType: 'selected_categories',
    targets: [],          // no product targets
    categoryIds: [500],   // triggered by category 500
    relatedProducts: [{ sallaProductId: 999 }],
    quantityTiers: [],
    upgradeSettings: null,
    recommendationSettings: null,
  };

  it('matches when the category is expanded to include an order product', () => {
    const ctx: MatchContext = {
      categoryProducts: new Map([[500, new Set([10, 20, 30])]]),
    };
    const matched = matchOffers(
      [categoryOffer],
      new Map([[20, 1], [999, 1]]),  // product 20 is in category 500
      ctx,
    );
    expect(matched.map((o) => o.id)).toContain(10);
  });

  it('does not match when category expansion has no overlap with order products', () => {
    const ctx: MatchContext = {
      categoryProducts: new Map([[500, new Set([10, 20, 30])]]),
    };
    const matched = matchOffers(
      [categoryOffer],
      new Map([[99, 1], [999, 1]]),  // product 99 is NOT in category 500
      ctx,
    );
    expect(matched).toHaveLength(0);
  });

  it('does not match when context has no data for the category', () => {
    const ctx: MatchContext = { categoryProducts: new Map() };
    const matched = matchOffers(
      [categoryOffer],
      new Map([[20, 1], [999, 1]]),
      ctx,
    );
    expect(matched).toHaveLength(0);
  });
});