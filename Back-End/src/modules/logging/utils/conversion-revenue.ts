import type { ConversionOffer } from './order-conversion.matcher';

export function calculateExtraRevenue(
  offer: ConversionOffer,
  amounts: Map<number, number>,
  productIds: Set<number>,
  quantities: Map<number, number>,
): number {
  let revenue = 0;

  switch (offer.kind) {
    case 'product_add_on':
    case 'cart_recommendation': {
      for (const row of offer.relatedProducts) {
        revenue += amounts.get(row.sallaProductId) ?? 0;
      }
      break;
    }

    case 'bundle': {
      const triggerProductTargets = new Set(
        offer.targets
          .filter((t) => t.entityType === 'product')
          .map((t) => t.sallaEntityId),
      );
      for (const row of offer.relatedProducts) {
        if (!triggerProductTargets.has(row.sallaProductId)) {
          revenue += amounts.get(row.sallaProductId) ?? 0;
        }
      }
      break;
    }

    case 'upgrade_offer': {
      const upgradeId = offer.upgradeSettings?.upgradeSallaProductId;
      if (upgradeId) {
        revenue += amounts.get(upgradeId) ?? 0;
      }
      break;
    }

    case 'quantity_discount': {
      const minQty = Math.min(
        ...offer.quantityTiers.map((tier) => tier.quantity),
        Number.POSITIVE_INFINITY,
      );
      if (!Number.isFinite(minQty)) break;

      const productTargets = offer.targets.filter(
        (target) => target.entityType === 'product',
      );
      const candidateIds =
        offer.targetType === 'all_products' || productTargets.length === 0
          ? [...productIds]
          : productTargets
              .map((target) => target.sallaEntityId)
              .filter((id) => productIds.has(id));

      for (const id of candidateIds) {
        if ((quantities.get(id) ?? 0) >= minQty) {
          revenue += amounts.get(id) ?? 0;
        }
      }
      break;
    }
  }

  return Math.round(revenue * 100) / 100;
}
