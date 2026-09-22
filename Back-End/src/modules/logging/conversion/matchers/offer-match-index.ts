import {
  type ConversionOffer,
  type MatchContext,
  matchOffers,
} from './order-conversion.matcher';

// ---------------------------------------------------------------------------
// Index shape (in-memory after deserialization)
// ---------------------------------------------------------------------------

export interface OfferMatchIndex {
  /** productId → Set of offerIds that declare this product as a trigger/target */
  byProduct: Map<number, Set<number>>;
  /** categoryId → Set of offerIds that declare this category as a trigger/target */
  byCategory: Map<number, Set<number>>;
  /** offerIds where targetType === 'all_products' (trigger on every product) */
  allProducts: Set<number>;
  /** Fast lookup for validation after candidate selection */
  offerById: Map<number, ConversionOffer>;
  /** Unix ms — for cache-age diagnostics in logs */
  builtAt: number;
}

// Serialized shape stored as JSON in Redis (Maps/Sets → plain objects/arrays)
interface SerializedIndex {
  byProduct: Record<string, number[]>;
  byCategory: Record<string, number[]>;
  allProducts: number[];
  offers: ConversionOffer[];
  builtAt: number;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Builds a reverse-lookup index from a flat list of active offers.
 * Pure function — no I/O, easy to unit test.
 */
export function buildOfferIndex(offers: ConversionOffer[]): OfferMatchIndex {
  const byProduct = new Map<number, Set<number>>();
  const byCategory = new Map<number, Set<number>>();
  const allProducts = new Set<number>();
  const offerById = new Map<number, ConversionOffer>();

  for (const offer of offers) {
    offerById.set(offer.id, offer);

    if (offer.targetType === 'all_products') {
      allProducts.add(offer.id);
      continue; // no need to index individual products/categories
    }

    // Index product targets
    for (const target of offer.targets) {
      if (target.entityType !== 'product') continue;
      const pid = target.sallaEntityId;
      if (!byProduct.has(pid)) byProduct.set(pid, new Set());
      byProduct.get(pid)!.add(offer.id);
    }

    // Index category targets
    for (const catId of offer.categoryIds) {
      if (!byCategory.has(catId)) byCategory.set(catId, new Set());
      byCategory.get(catId)!.add(offer.id);
    }

    // Also index related-product IDs so recommendations / addons can be found
    // when the *recommended* product (not the trigger) is in the order.
    for (const rp of offer.relatedProducts) {
      const pid = rp.sallaProductId;
      if (!byProduct.has(pid)) byProduct.set(pid, new Set());
      byProduct.get(pid)!.add(offer.id);
    }

    // Upgrade target: the upgrade product itself
    if (offer.upgradeSettings?.upgradeSallaProductId) {
      const pid = offer.upgradeSettings.upgradeSallaProductId;
      if (!byProduct.has(pid)) byProduct.set(pid, new Set());
      byProduct.get(pid)!.add(offer.id);
    }
  }

  return { byProduct, byCategory, allProducts, offerById, builtAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

export function serializeIndex(index: OfferMatchIndex): string {
  const payload: SerializedIndex = {
    byProduct: mapOfSetsToRecord(index.byProduct),
    byCategory: mapOfSetsToRecord(index.byCategory),
    allProducts: [...index.allProducts],
    offers: [...index.offerById.values()],
    builtAt: index.builtAt,
  };
  return JSON.stringify(payload);
}

export function deserializeIndex(raw: string): OfferMatchIndex {
  const payload = JSON.parse(raw) as SerializedIndex;
  const offers = payload.offers;

  return {
    byProduct: recordToMapOfSets(payload.byProduct),
    byCategory: recordToMapOfSets(payload.byCategory),
    allProducts: new Set(payload.allProducts),
    offerById: new Map(offers.map((o) => [o.id, o])),
    builtAt: payload.builtAt,
  };
}

// ---------------------------------------------------------------------------
// Fast matching via the index
// ---------------------------------------------------------------------------

/**
 * Uses the inverted index to select candidate offers cheaply, then runs the
 * full per-offer validation only on that smaller set.
 *
 * Complexity: O(|orderProducts| + |candidates|)  vs. O(allOffers × orderProducts)
 */
export function matchOffersFromIndex(
  index: OfferMatchIndex,
  quantities: Map<number, number>,
  ctx: MatchContext,
): ConversionOffer[] {
  const orderProductIds = new Set(quantities.keys());
  const candidateIds = new Set<number>(index.allProducts);

  // Offers triggered by any product in the order
  for (const productId of orderProductIds) {
    for (const offerId of index.byProduct.get(productId) ?? []) {
      candidateIds.add(offerId);
    }
  }

  // Offers triggered by a category that contains any product in the order
  for (const [catId, offerIds] of index.byCategory) {
    const catProducts = ctx.categoryProducts.get(catId);
    if (!catProducts) continue;
    if ([...orderProductIds].some((p) => catProducts.has(p))) {
      for (const offerId of offerIds) candidateIds.add(offerId);
    }
  }

  // Collect full offer objects for the candidates
  const candidates: ConversionOffer[] = [];
  for (const offerId of candidateIds) {
    const offer = index.offerById.get(offerId);
    if (offer) candidates.push(offer);
  }

  // Delegate to the existing matcher for per-offer type validation
  return matchOffers(candidates, quantities, ctx);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function mapOfSetsToRecord(
  map: Map<number, Set<number>>,
): Record<string, number[]> {
  const rec: Record<string, number[]> = {};
  for (const [k, v] of map) {
    rec[String(k)] = [...v];
  }
  return rec;
}

function recordToMapOfSets(
  rec: Record<string, number[]>,
): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  for (const [k, v] of Object.entries(rec)) {
    map.set(Number(k), new Set(v));
  }
  return map;
}
