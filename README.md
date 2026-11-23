# Cart Bundles

Cart Bundles is a Salla ecommerce app that lets merchants create, manage, and measure cart offers. It combines a Next.js merchant/admin frontend with a NestJS backend, PostgreSQL, Redis/BullMQ background jobs, and Salla Admin API/webhook integrations.

## What it does

- Offer builder for quantity discounts, product add-ons, bundles, upgrade offers, and cart recommendations.
- Salla catalog integration for products, categories, and coupons.
- Embedded merchant dashboard inside Salla using the Salla Embedded SDK.
- Standalone Arabic/English merchant login and an admin console.
- Storefront event ingestion for impressions, clicks, and add-to-cart actions.
- Order webhook processing for conversion attribution.
- Activity logs, merchant health, suggestions, analytics, and retention jobs.
- Prometheus metrics, Grafana dashboards, alert rules, and k6 load tests.

## Repository layout

```text
cart-bundles/
├── Front-End/                 # Next.js app: embedded Salla UI, merchant pages, admin dashboard
│   ├── app/                   # App Router pages and API route files
│   ├── components/            # UI, offer builders, admin, Salla storefront components
│   ├── lib/api/               # Typed frontend API clients
│   ├── messages/              # next-intl translations (ar/en)
│   └── services/salla/        # Salla auth/webhook helpers
│
├── Back-End/                  # NestJS API
│   ├── src/modules/           # Auth, OAuth, offers, products, webhooks, analytics, etc.
│   ├── drizzle/               # Drizzle schema and SQL migrations
│   ├── load-tests/            # k6 scenarios, seed data, mock Salla, reconciliation
│   ├── observability/         # Prometheus config/rules and Grafana dashboard
│   └── docker-compose.yml     # Production-oriented Postgres/Redis/backend stack
│
└── README.md
```

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI, TanStack Query, next-intl, Zod, React Hook Form, Salla Embedded SDK |
| Backend | NestJS 11, TypeScript, Drizzle ORM, PostgreSQL, Redis, BullMQ, JWT/cookie auth, Salla Admin API |
| Data/background jobs | PostgreSQL 18, Redis 7, BullMQ queues for webhooks, storefront events, and activity logs |
| Observability/testing | Prometheus, Grafana, k6, Sentry hooks |
| Package manager | pnpm, managed per package through Corepack |

## Prerequisites

- Node.js 20+; Node.js 22 is recommended because the backend Docker image uses `node:22-alpine`.
- pnpm. The backend declares `pnpm@11.22.0` and the frontend declares `pnpm@10.33.0`; Corepack will select the right version per directory.
- PostgreSQL and Redis for local backend development.
- Salla Partners credentials for full merchant/auth/webhook testing.

## Quick start

### 1. Backend

```bash
cd Back-End
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed-admin   # optional, requires ADMIN_EMAIL and ADMIN_PASSWORD in .env
pnpm start:dev
```

The API listens on `http://localhost:3000` by default and uses the global prefix `/api/v1`. For the frontend-on-`3001` setup below, update `SALLA_REDIRECT_URI` in `Back-End/.env` to `http://localhost:3001/ar/login/callback`.

Useful checks:

- Health: `GET http://localhost:3000/api/v1/health`
- Metrics: `GET http://localhost:3000/api/v1/metrics` when `METRICS_BEARER_TOKEN` is configured

If you do not have local PostgreSQL/Redis, start them with Docker or point `DATABASE_URL` and `REDIS_URL` at existing services. `Back-End/docker-compose.yml` is production-oriented and expects an external `nginx-proxy` network, so it is not the simplest local-dev setup.

### 2. Frontend

Create `Front-End/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_BASE_URL` is optional and defaults to `/api/v1`.

Then run:

```bash
cd Front-End
pnpm install
pnpm dev -- -p 3001
```

Port `3001` is used in this example so the frontend can run beside the backend on port `3000`. You can choose another free port, but keep `NEXT_PUBLIC_BACKEND_URL`, `SALLA_REDIRECT_URI`, and any public URLs in sync.

### Local URLs

| Purpose | URL |
| --- | --- |
| Frontend home | `http://localhost:3001/ar` |
| Merchant OAuth login | `http://localhost:3001/ar/login` |
| OAuth callback | `http://localhost:3001/ar/login/callback` |
| Embedded Salla app | `http://localhost:3001/salla/embed` |
| Admin login | `http://localhost:3001/ar/admin/login` |
| Backend health | `http://localhost:3000/api/v1/health` |

The frontend supports `ar` and `en`, with Arabic as the default locale and RTL layout. Unprefixed Salla iframe paths such as `/salla/embed` are rewritten to the default locale by `Front-End/proxy.ts`.

## Backend scripts

Run from `Back-End/`:

| Command | Purpose |
| --- | --- |
| `pnpm start:dev` | Start NestJS in watch mode |
| `pnpm start` | Start NestJS once |
| `pnpm build` | Build NestJS and compile path aliases |
| `pnpm start:prod` | Run the production build |
| `pnpm lint` | Run ESLint with fixes |
| `pnpm test` | Run Jest unit tests |
| `pnpm test:e2e` | Run Jest e2e tests |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:generate` | Generate a new Drizzle migration |
| `pnpm db:push` | Push schema changes directly |
| `pnpm db:seed-admin` | Create/update the admin user |
| `pnpm db:backfill-daily-stats` | Example maintenance/backfill script; see `package.json` for the others |

## Frontend scripts

Run from `Front-End/`:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Build the Next.js app |
| `pnpm start` | Start the production Next.js server |
| `pnpm lint` | Run ESLint |
| `pnpm db:*` | Drizzle commands for the frontend's own `lib/db` schema |

The UI calls the backend through `/api/v1`. `Front-End/next.config.ts` rewrites `/api/:path*` to `${NEXT_PUBLIC_BACKEND_URL}/api/:path*`, so browser requests stay same-origin while the NestJS API remains the source of truth.

## API overview

All backend routes are under `/api/v1`.

| Area | Main routes |
| --- | --- |
| Health/metrics | `/health`, `/metrics` |
| Embedded auth | `/salla/embed/auth/verify` |
| Standalone OAuth | `/salla/oauth/authorize`, `/salla/oauth/token`, `/salla/oauth/logout`, `/salla/oauth/me` |
| Admin auth/session | `/admin/login`, `/admin/logout`, `/admin/session` |
| Salla catalog | `/salla/embed/products`, `/salla/embed/categories`, `/salla/embed/coupons`, `/salla/products/recommendations` |
| Offers | `/offers`, `/offers/storefront/:merchantId`, `/offers/dashboard`, `/offers/{quantity,addon,bundle,upgrade,recommendation}` |
| Appearance presets | `/appearance-presets` |
| Storefront events | `/storefront/events` |
| Activity/admin | `/activity`, `/admin/overview`, `/admin/merchants`, `/admin/activity` |
| Suggestions | `/suggestions`, `/admin/suggestions` |
| Salla webhooks | `/salla/webhook` |

The backend uses global validation, structured exception filters, request logging, correlation IDs, cookie parsing, role guards, rate limits, and CORS rules. Public storefront endpoints are available to `*.salla.sa` storefront origins in addition to `ALLOWED_CORS_ORIGINS`.

## Salla configuration

### Embedded app

- Embedded page URL: `https://<frontend-host>/salla/embed`
- The layout initializes `@salla.sa/embedded-sdk`, reads the embedded token, calls `/api/v1/salla/embed/auth/verify`, then registers nav items for offers, activity, and suggestions.
- Embedded auth issues a partitioned HttpOnly `embedToken` cookie.

### Webhooks

Point Salla webhooks at the backend:

```text
POST https://<backend-host>/api/v1/salla/webhook
```

Use `Back-End/SALLA.md` for the required OAuth scopes and webhook events. In short:

- App lifecycle events for install/update/uninstall/trial/subscription/settings.
- Catalog events for product/category cache invalidation.
- `order.created` and `order.updated` for conversion attribution.
- `app.store.authorize` remains the Easy Mode token source for the embedded dashboard.

### Standalone OAuth login

The frontend also has a standalone merchant login flow:

1. User opens `/ar/login` or `/en/login`.
2. Frontend calls `/api/v1/salla/oauth/authorize`.
3. Backend redirects to Salla OAuth.
4. Salla redirects back to `/ar/login/callback` or `/en/login/callback`.
5. Frontend posts `code` and `state` to `/api/v1/salla/oauth/token`.
6. Backend exchanges the code, stores merchant tokens, and sets the local session cookie.

`SALLA_REDIRECT_URI` must exactly match the callback URL registered in Salla Partners.

## Environment variables

### Backend

Copy `Back-End/.env.example` to `Back-End/.env`. The main variables are:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode |
| `PORT` | API port, default `3000` |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SALLA_CLIENT_ID` | Salla OAuth client ID |
| `SALLA_CLIENT_SECRET` | Salla OAuth client secret |
| `SALLA_APP_ID` | Salla app ID |
| `SALLA_WEBHOOK_SECRET` | Webhook HMAC secret |
| `SALLA_REDIRECT_URI` | Exact OAuth callback URL |
| `SALLA_OAUTH_SCOPE` | OAuth scopes |
| `JWT_SECRET` | Local session JWT secret |
| `JWT_EXPIRES_IN` | Local JWT lifetime |
| `ALLOWED_CORS_ORIGINS` | Comma-separated trusted origins |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin seed credentials |
| `METRICS_BEARER_TOKEN` | Optional bearer token for `/api/v1/metrics` |
| `SENTRY_DSN` | Optional Sentry error-reporting DSN |
| `SALLA_API_BASE_URL` / `SALLA_ACCOUNTS_BASE_URL` | Optional overrides for staging/mock Salla |

`POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` are used by `docker-compose.yml` when running the containerized stack.

### Frontend

Create `Front-End/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=/api/v1
```

`NEXT_PUBLIC_API_BASE_URL` is optional; `/api/v1` is the default when it is omitted. The frontend also contains Drizzle config and `app/api/v1/*` route files that reference `DATABASE_URL`, `SALLA_*`, and `JWT_SECRET`. Those are only needed if you intentionally run the frontend's own DB/API utilities; the main UI flow uses the Next rewrite to the backend.

## Database and background jobs

The backend schema lives in `Back-End/drizzle/schema.ts`, with SQL migrations in `Back-End/drizzle/`.

Main tables include:

- `merchants` — Salla merchant IDs and stored OAuth tokens.
- `users` — admin users.
- `offers` and offer-specific tables — quantity tiers, add-ons, bundles, upgrades, recommendations, targets, related products, and appearance.
- `offer_stats` and `daily_stats` — storefront and conversion metrics.
- `activity_logs` and `event_logs` — audit/event history.
- `suggestions` — merchant feedback workflow.

BullMQ queues are defined in `Back-End/src/queue/queue.constants.ts`:

- `salla-webhooks`
- `storefront-events`
- `app-activity`

Webhooks are acknowledged quickly and processed asynchronously. Storefront events are rate-limited, queued, and flushed into stats. Order webhooks feed conversion attribution.

## Docker

Build the backend image from `Back-End/`:

```bash
docker build -t cart-bundles-backend:latest .
```

The included `docker-compose.yml` runs the backend, PostgreSQL, and Redis for a production-style deployment. It expects the external `nginx-proxy` Docker network to already exist and uses `${IMAGE_NAME}` / `${IMAGE_TAG}` for the backend image.

## Load tests and observability

- Load-test guide: `Back-End/load-tests/README.md`
- Observability assets: `Back-End/observability/README.md`
- Salla integration notes: `Back-End/SALLA.md`

Do not run the load-test suite against production. It seeds synthetic merchants, floods webhook/event endpoints, and can use a mock Salla server.

## Troubleshooting

- **Frontend cannot reach the API:** confirm `NEXT_PUBLIC_BACKEND_URL` points to the backend origin, not `/api/v1`, then restart `pnpm dev`.
- **Port conflict:** run the frontend on another port, for example `pnpm dev -- -p 3001`.
- **Webhook signature failures:** verify `SALLA_WEBHOOK_SECRET` and send webhooks directly to `POST /api/v1/salla/webhook`.
- **OAuth callback mismatch:** `SALLA_REDIRECT_URI` must exactly match the URL registered in Salla Partners, including locale and trailing slash behavior.
- **Embedded app closes immediately:** check that `/api/v1/salla/embed/auth/verify` returns successfully and that the Salla Embedded SDK token is present.
- **Metrics endpoint returns 401:** configure `METRICS_BEARER_TOKEN` and send it as a bearer token.
