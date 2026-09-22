import { calculateExtraRevenue } from './conversion-revenue';
import type { ConversionOffer } from './order-conversion.matcher';

describe('calculateExtraRevenue', () => {
  it('calculates extra revenue for product_add_on and cart_recommendation', () => {
    const offer: ConversionOffer = {
      id: 1,
      kind: 'product_add_on',
      targetType: 'selected_products',
      targets: [{ entityType: 'product', sallaEntityId: 10 }],
      categoryIds: [],
      relatedProducts: [{ sallaProductId: 99 }, { sallaProductId: 100 }],
      quantityTiers: [],
      upgradeSettings: null,
      recommendationSettings: null,
    };

    const amounts = new Map([
      [10, 50],
      [99, 25.5],
      [100, 30],
    ]);
    const productIds = new Set([10, 99, 100]);
    const quantities = new Map([
      [10, 1],
      [99, 1],
      [100, 1],
    ]);

    expect(calculateExtraRevenue(offer, amounts, productIds, quantities)).toBe(
      55.5,
    );
  });

  it('calculates extra revenue for bundle (excluding trigger product)', () => {
    const offer: ConversionOffer = {
      id: 2,
      kind: 'bundle',
      targetType: 'selected_products',
      targets: [{ entityType: 'product', sallaEntityId: 10 }],
      categoryIds: [],
      relatedProducts: [{ sallaProductId: 10 }, { sallaProductId: 20 }],
      quantityTiers: [],
      upgradeSettings: null,
      recommendationSettings: null,
    };

    const amounts = new Map([
      [10, 100],
      [20, 45.25],
    ]);
    const productIds = new Set([10, 20]);
    const quantities = new Map([
      [10, 1],
      [20, 1],
    ]);

    expect(calculateExtraRevenue(offer, amounts, productIds, quantities)).toBe(
      45.25,
    );
  });

  it('calculates extra revenue for upgrade_offer', () => {
    const offer: ConversionOffer = {
      id: 3,
      kind: 'upgrade_offer',
      targetType: 'selected_products',
      targets: [],
      categoryIds: [],
      relatedProducts: [],
      quantityTiers: [],
      upgradeSettings: { upgradeSallaProductId: 40 },
      recommendationSettings: null,
    };

    const amounts = new Map([
      [10, 50],
      [40, 120],
    ]);
    const productIds = new Set([10, 40]);
    const quantities = new Map([
      [10, 1],
      [40, 1],
    ]);

    expect(calculateExtraRevenue(offer, amounts, productIds, quantities)).toBe(
      120,
    );
  });

  it('calculates extra revenue for quantity_discount if tier requirement met', () => {
    const offer: ConversionOffer = {
      id: 4,
      kind: 'quantity_discount',
      targetType: 'selected_products',
      targets: [{ entityType: 'product', sallaEntityId: 10 }],
      categoryIds: [],
      relatedProducts: [],
      quantityTiers: [{ quantity: 3 }],
      upgradeSettings: null,
      recommendationSettings: null,
    };

    const amounts = new Map([
      [10, 300.999],
      [20, 50],
    ]);
    const productIds = new Set([10, 20]);
    const quantities = new Map([
      [10, 3],
      [20, 1],
    ]);

    expect(calculateExtraRevenue(offer, amounts, productIds, quantities)).toBe(
      301,
    );
  });

  it('returns 0 when amounts map has missing product ids', () => {
    const offer: ConversionOffer = {
      id: 5,
      kind: 'product_add_on',
      targetType: 'selected_products',
      targets: [{ entityType: 'product', sallaEntityId: 10 }],
      categoryIds: [],
      relatedProducts: [{ sallaProductId: 99 }],
      quantityTiers: [],
      upgradeSettings: null,
      recommendationSettings: null,
    };

    const amounts = new Map<number, number>();
    const productIds = new Set([10, 99]);
    const quantities = new Map([
      [10, 1],
      [99, 1],
    ]);

    expect(calculateExtraRevenue(offer, amounts, productIds, quantities)).toBe(
      0,
    );
  });
});
