/**
 * Events fired by the cart widget JS and accepted by POST /storefront/events.
 *
 * `offer.add_to_cart` is the primary conversion KPI — it confirms a shopper
 * clicked "Add" inside the widget. Order-level influence tracking is handled
 * server-side via the webhooks pipeline and is NOT reported by the widget.
 */
export const STOREFRONT_EVENTS = [
  'offer.impression',
  'offer.click',
  'offer.add_to_cart',
] as const;

export type StorefrontEventName = (typeof STOREFRONT_EVENTS)[number];

/** Stat field incremented for each storefront event type. */
export type OfferStatField =
  | 'impressions'
  | 'clicks'
  | 'addToCart'
  | 'conversions'
  | 'conversionsAttributed';

/** Maps each incoming event name to the stat field it increments. */
export const STOREFRONT_EVENT_FIELD: Record<StorefrontEventName, OfferStatField> = {
  'offer.impression':  'impressions',
  'offer.click':       'clicks',
  'offer.add_to_cart': 'addToCart',
};

/** Job payload enqueued by StorefrontEventsController and consumed by its processor. */
export interface StorefrontEventJob {
  merchantId: number;
  offerId: number;
  event: StorefrontEventName;
  productId?: number;
  source?: string;
}
