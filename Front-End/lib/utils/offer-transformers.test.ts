import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultUpgradeDraft,
  fullOfferToUpgradeDraft,
} from './offer-transformers';
import type { UpgradeOfferFull } from '../schemas/upgrade-offer';

describe('fullOfferToUpgradeDraft coupon fields', () => {
  it('copies couponCode and sallaCouponId from upgradeSettings', () => {
    const offer = {
      id: 1,
      merchantId: 9,
      kind: 'upgrade_offer',
      internalName: 'u',
      title: { ar: 'أ', en: 'A' },
      subtitle: null,
      targetType: 'selected_products',
      expiryDate: null,
      status: 'active',
      redirectToCartAfterAdd: false,
      hideSallaPopup: true,
      targets: [{ sallaEntityId: 11 }],
      upgradeSettings: {
        offerId: 1,
        baseSallaProductId: 11,
        upgradeSallaProductId: 22,
        couponCode: 'UPGRADE10',
        sallaCouponId: 55,
      },
      appearance: undefined,
    } as unknown as UpgradeOfferFull;

    const draft = fullOfferToUpgradeDraft(offer);
    assert.equal(draft.settings.couponCode, 'UPGRADE10');
    assert.equal(draft.settings.sallaCouponId, 55);
  });

  it('leaves coupon fields empty on default draft', () => {
    assert.equal(defaultUpgradeDraft.settings.couponCode, undefined);
    assert.equal(defaultUpgradeDraft.settings.sallaCouponId, undefined);
  });
});
