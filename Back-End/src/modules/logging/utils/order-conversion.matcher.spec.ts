import {
  extractOrderId,
  extractOrderStatus,
  extractProductQuantities,
  matchOffers,
  type ConversionOffer,
} from './order-conversion.matcher';

describe('order conversion helpers', () => {
  it('reads nested Salla order ids and line items', () => {
    const payload = {
      id: 4411,
      status: { slug: 'in_progress' },
      items: [
        { product_id: 10, quantity: 3 },
        { product: { id: 20 }, qty: 1 },
      ],
    };

    expect(extractOrderId(payload)).toBe(4411);
    expect(extractOrderStatus(payload)).toBe('in_progress');
    expect(extractProductQuantities(payload)).toEqual(
      new Map([
        [10, 3],
        [20, 1],
      ]),
    );
  });
});

describe('matchOffers', () => {
  it('matches quantity, addon, bundle, upgrade, and recommendation offers', () => {
    const offers: ConversionOffer[] = [
      {
        id: 1,
        kind: 'quantity_discount',
        targetType: 'selected_products',
        targets: [{ entityType: 'product', sallaEntityId: 10 }],
        relatedProducts: [],
        quantityTiers: [{ quantity: 2 }],
        upgradeSettings: null,
        recommendationSettings: null,
      },
      {
        id: 2,
        kind: 'product_add_on',
        targetType: 'selected_products',
        targets: [{ entityType: 'product', sallaEntityId: 10 }],
        relatedProducts: [{ sallaProductId: 99 }],
        quantityTiers: [],
        upgradeSettings: null,
        recommendationSettings: null,
      },
      {
        id: 3,
        kind: 'bundle',
        targetType: 'selected_products',
        targets: [{ entityType: 'product', sallaEntityId: 10 }],
        relatedProducts: [{ sallaProductId: 30 }, { sallaProductId: 31 }],
        quantityTiers: [],
        upgradeSettings: null,
        recommendationSettings: null,
      },
      {
        id: 4,
        kind: 'upgrade_offer',
        targetType: 'selected_products',
        targets: [],
        relatedProducts: [],
        quantityTiers: [],
        upgradeSettings: { upgradeSallaProductId: 40 },
        recommendationSettings: null,
      },
      {
        id: 5,
        kind: 'cart_recommendation',
        targetType: 'all_products',
        targets: [],
        relatedProducts: [{ sallaProductId: 50 }],
        quantityTiers: [],
        upgradeSettings: null,
        recommendationSettings: {
          mode: 'cart_related',
          triggerSallaProductId: 10,
        },
      },
    ];

    expect(
      matchOffers(
        offers,
        new Map([
          [10, 3],
          [30, 1],
          [31, 1],
          [40, 1],
          [50, 1],
          [99, 1],
        ]),
      ),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not match quantity offers below the cheapest tier', () => {
    const offers: ConversionOffer[] = [
      {
        id: 1,
        kind: 'quantity_discount',
        targetType: 'selected_products',
        targets: [{ entityType: 'product', sallaEntityId: 10 }],
        relatedProducts: [],
        quantityTiers: [{ quantity: 3 }],
        upgradeSettings: null,
        recommendationSettings: null,
      },
    ];

    expect(matchOffers(offers, new Map([[10, 2]]))).toEqual([]);
  });
});
