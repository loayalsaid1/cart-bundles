# Salla scopes, webhooks, and Easy Mode

This app is an **embedded Easy Mode** app. Merchant auth comes from
`app.store.authorize` (webhook) plus Embedded SDK token introspection.
Do not switch OAuth to Custom Mode for the dashboard.

## Required OAuth scopes

Set these on the app in Salla Partners Portal. Easy Mode still needs them
so Admin API calls succeed:

| Scope | Why |
| --- | --- |
| `offline_access` | Refresh tokens after Easy Mode install |
| `products.read_write` | Product search and bulk sale-price actions |
| `categories.read` | Offer targeting by category |
| `coupons.read` | Upgrade-offer coupon picker |
| `specialoffers.read_write` | Sync quantity / addon / bundle offers to Salla |
| `webhooks.read_write` | Optional: manage webhook subscriptions via API |

Do **not** request `orders.read`. Order conversions are attributed from
`order.created` / `order.updated` webhooks (line items), not by polling
the Merchant API. Subscribe those events in Partners Portal.

## Required webhooks

Point the app webhook URL at `POST /api/v1/salla/webhook`.

### App events (Easy Mode — already partially handled)

Subscribe all of these. Tokens still come only from `app.store.authorize`.

- `app.store.authorize`
- `app.installed`
- `app.updated`
- `app.uninstalled`
- `app.trial.started`
- `app.trial.expired`
- `app.trial.canceled`
- `app.subscription.started`
- `app.subscription.expired`
- `app.subscription.canceled`
- `app.subscription.renewed`
- `app.settings.updated`

### Catalog events (cache invalidation)

Subscribe these so Redis catalog cache does not serve stale products:

- `product.created`
- `product.updated`
- `product.deleted`
- `category.created`
- `category.updated`
- `category.deleted`

### Order events (conversion attribution)

Subscribe these so paid/created orders can increment `offer.conversion`:

- `order.created`
- `order.updated`

Unknown events are stored and ignored. We never write to Salla endpoints
we do not already use.

## Caching rules

- Cache **GET** catalog (`products`, `categories`, `coupons`) per merchant.
- Cache storefront offer payloads for 60s; invalidate on offer writes.
- Cache merchant access tokens in Redis with TTL bounded by token expiry.
- Never cache Salla write responses (`specialoffers` POST/PUT/DELETE,
  `/products/actions`).
- Webhooks, activity logs, and storefront events go through Redis streams
  so the HTTP handler can ACK Salla quickly.
