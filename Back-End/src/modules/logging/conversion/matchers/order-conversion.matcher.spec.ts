import {
  extractOrderId,
  extractOrderStatus,
  extractProductAmounts,
  extractProductQuantities,
  matchOffers,
  type ConversionOffer,
  type MatchContext,
} from './order-conversion.matcher';
import type { SallaOrderData } from '../../../webhooks/types/salla-events';

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

describe('order-conversion extraction helpers', () => {
  const payload: SallaOrderData = {
    id: 2116149737,
    reference_id: 41027662,
    status: { id: 566146469, name: 'بإنتظار المراجعة', slug: 'under_review' },
    items: [
      {
        id: 70815337,
        name: 'بيتزا',
        sku: '54534534',
        quantity: 3,
        amounts: {
          price_without_tax: { amount: 90 },
          total: { amount: 186 },
        },
        product: { id: 720881993, type: 'food', name: 'بيتزا', sku: '54534534' },
      },
      {
        id: 70815338,
        name: 'deleted item',
        sku: '',
        quantity: 1,
        product: null, // product was removed from the store
      },
    ],
  };

  it('extracts order id and status slug', () => {
    expect(extractOrderId(payload)).toBe(2116149737);
    expect(extractOrderStatus(payload)).toBe('under_review');
  });

  it('maps product quantities, skips null products', () => {
    expect(extractProductQuantities(payload)).toEqual(
      new Map([[720881993, 3]]),
    );
  });

  it('maps line amounts using total, skips null products', () => {
    expect(extractProductAmounts(payload)).toEqual(
      new Map([[720881993, 186]]),
    );
  });

  it('falls back to price_without_tax when total is absent', () => {
    const p: SallaOrderData = {
      ...payload,
      items: [
        {
          id: 1, name: 'X', sku: '', quantity: 1,
          amounts: { price_without_tax: { amount: 55 } },
          product: { id: 10, type: 'product', name: 'X', sku: '' },
        },
      ],
    };
    expect(extractProductAmounts(p)).toEqual(new Map([[10, 55]]));
  });
});

// ---------------------------------------------------------------------------
// Helpers for building test offers
// ---------------------------------------------------------------------------

const base = {
  categoryIds: [] as number[],
  quantityTiers: [] as { quantity: number }[],
  upgradeSettings: null,
  recommendationSettings: null,
  relatedProducts: [] as { sallaProductId: number }[],
};

function productOffer(overrides: Partial<ConversionOffer>): ConversionOffer {
  return { ...base, targetType: 'selected_products', targets: [], ...overrides } as ConversionOffer;
}

function categoryOffer(overrides: Partial<ConversionOffer>): ConversionOffer {
  return { ...base, targetType: 'selected_categories', targets: [], ...overrides } as ConversionOffer;
}

// ---------------------------------------------------------------------------
// targetType dispatching
// ---------------------------------------------------------------------------

describe('targetType dispatch', () => {
  const allProductsAddon: ConversionOffer = {
    ...base,
    id: 1, kind: 'product_add_on', targetType: 'all_products',
    targets: [],
    relatedProducts: [{ sallaProductId: 99 }],
  };

  it('all_products offer triggers on any product in the order', () => {
    const matched = matchOffers(
      [allProductsAddon],
      new Map([[50, 1], [99, 1]]),
    );
    expect(matched).toHaveLength(1);
  });

  it('selected_products offer only triggers on target products', () => {
    const offer = productOffer({
      id: 2, kind: 'product_add_on',
      targets: [{ entityType: 'product', sallaEntityId: 10 }],
      relatedProducts: [{ sallaProductId: 99 }],
    });
    // Order has 99 but NOT 10 (the trigger)
    expect(matchOffers([offer], new Map([[99, 1]]))).toHaveLength(0);
    // Order has both 10 and 99
    expect(matchOffers([offer], new Map([[10, 1], [99, 1]]))).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Quantity discount
// ---------------------------------------------------------------------------

describe('quantity_discount', () => {
  const offer = productOffer({
    id: 1, kind: 'quantity_discount',
    targets: [{ entityType: 'product', sallaEntityId: 10 }],
    quantityTiers: [{ quantity: 2 }],
  });

  it('matches when qty meets the minimum tier', () => {
    expect(matchOffers([offer], new Map([[10, 2]]))).toHaveLength(1);
    expect(matchOffers([offer], new Map([[10, 5]]))).toHaveLength(1);
  });

  it('does not match when qty is below minimum', () => {
    expect(matchOffers([offer], new Map([[10, 1]]))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Bundle
// ---------------------------------------------------------------------------

describe('bundle', () => {
  const offer = productOffer({
    id: 2, kind: 'bundle',
    targets: [{ entityType: 'product', sallaEntityId: 10 }],
    relatedProducts: [{ sallaProductId: 30 }, { sallaProductId: 31 }],
  });

  it('matches when trigger and ALL related products are in order', () => {
    expect(matchOffers([offer], new Map([[10, 1], [30, 1], [31, 1]]))).toHaveLength(1);
  });

  it('does not match when any related product is missing', () => {
    expect(matchOffers([offer], new Map([[10, 1], [30, 1]]))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Upgrade
// ---------------------------------------------------------------------------

describe('upgrade_offer', () => {
  const offer: ConversionOffer = {
    ...base,
    id: 3, kind: 'upgrade_offer', targetType: 'selected_products',
    targets: [],
    upgradeSettings: { upgradeSallaProductId: 40 },
  };

  it('matches when the upgrade product is in the order', () => {
    expect(matchOffers([offer], new Map([[40, 1]]))).toHaveLength(1);
  });

  it('does not match when the upgrade product is absent', () => {
    expect(matchOffers([offer], new Map([[10, 1]]))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Category targets
// ---------------------------------------------------------------------------

describe('selected_categories', () => {
  const offer = categoryOffer({
    id: 10, kind: 'product_add_on',
    categoryIds: [500],
    relatedProducts: [{ sallaProductId: 999 }],
  });

  const ctxWithCategory: MatchContext = {
    categoryProducts: new Map([[500, new Set([10, 20, 30])]]),
  };

  it('matches when an order product is in the expanded category', () => {
    const matched = matchOffers(
      [offer],
      new Map([[20, 1], [999, 1]]),
      ctxWithCategory,
    );
    expect(matched).toHaveLength(1);
  });

  it('does not match when order products are not in the category', () => {
    const matched = matchOffers(
      [offer],
      new Map([[99, 1], [999, 1]]),
      ctxWithCategory,
    );
    expect(matched).toHaveLength(0);
  });

  it('does not match when context has no data for the category (token miss)', () => {
    expect(
      matchOffers([offer], new Map([[20, 1], [999, 1]]), { categoryProducts: new Map() }),
    ).toHaveLength(0);
  });

  it('category quantity_discount resolves target product ids correctly', () => {
    const qtyOffer = categoryOffer({
      id: 11, kind: 'quantity_discount',
      categoryIds: [500],
      quantityTiers: [{ quantity: 2 }],
    });
    // product 20 is in category 500, qty 3 ≥ 2
    expect(
      matchOffers([qtyOffer], new Map([[20, 3]]), ctxWithCategory),
    ).toHaveLength(1);
    // product 20 is in category 500, qty 1 < 2
    expect(
      matchOffers([qtyOffer], new Map([[20, 1]]), ctxWithCategory),
    ).toHaveLength(0);
  });
});
