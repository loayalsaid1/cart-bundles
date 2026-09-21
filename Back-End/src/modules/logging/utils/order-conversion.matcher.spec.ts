import {
  extractOrderId,
  extractOrderStatus,
  extractProductQuantities,
  extractProductAmounts,
  matchOffers,
  type ConversionOffer,
} from './order-conversion.matcher';
import type { SallaOrderData } from '../../webhooks/types/salla-events';

describe('order conversion helpers', () => {
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
          id: 1,
          name: '',
          sku: '',
          quantity: 2,
          amounts: { total: { amount: 150.5 } },
          product: { id: 10, type: 'product', name: '', sku: '' },
        },
        {
          id: 2,
          name: '',
          sku: '',
          quantity: 1,
          amounts: { price_without_tax: { amount: 50.0 } },
          product: { id: 10, type: 'product', name: '', sku: '' },
        },
        {
          id: 3,
          name: '',
          sku: '',
          quantity: 1,
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
});