# Cart-Bundles NestJS Backend

Translate the existing Next.js API routes from `f:\Projects\UTeer\cart-bundles` into a standalone NestJS backend following the exact same patterns as the Axonelix backend. The frontend will be wired separately.

---

## What the Next.js app does (source of truth)

| Route | Method | What it does |
|---|---|---|
| `GET /api/salla/embed/auth/verify?token=` | GET | Introspects a Salla SDK token → issues our own JWT → sets `embedToken` HttpOnly cookie (CHIPS/Partitioned) |
| `GET /api/v1/salla/embed/products?query=` | GET | Reads `embedToken` cookie or `Authorization` header, verifies our JWT, fetches products from Salla Admin API |
| `POST /api/v1/salla/embed/products/discount` | POST | Same JWT auth; applies bulk pricing (set_sale / remove_sale) via Salla Actions API |
| `GET /api/v1/salla/products/recommendations?storeId=&productId=` | GET | Public (storeId in query); gets Salla access token from DB, fetches products from Salla API with CORS for `demostore.salla.sa` |
| `POST /api/v1/salla/webhook` | POST | Verifies HMAC-SHA256 signature; dispatches `app.store.authorize` and `app.uninstalled` events; logs all events to DB |
| `GET /api/v1/db` | GET | Health-check: tests DB connectivity |

**Database entities** (Drizzle/Postgres):
- `merchants` — `id`, `merchant_id`, `access_token`, `refresh_token`, `expires_at`, `is_active`, `created_at`, `updated_at`
- `event_logs` — `id`, `event_name`, `event_data` (jsonb), `event_date`
- `users` — `id`, `name`, `email`, `created_at` (referenced but not used in API yet)

**Services**:
- `AuthService` — `getValidAccessToken(merchantId)` — reads from DB, refreshes via Salla OAuth2 if expired
- `SallaEmbedAuth` — `inspect(token)` (calls Salla introspection API) → `createToken(data)` (issues JWT) → `verifyToken(token)` (verifies our JWT)
- `SallaProductService` — `getProducts(accessToken, keyword?)`, `applyBulkPricing(accessToken, payload)`
- `AppEventsHandlers` — `handleAppAuthorized`, `handleAppUninstalled`
- `EventLogger` — `logEvent(payload)` → inserts into `event_logs`

---

## Proposed Changes

### Project location

New project at: `f:\Projects\UTeer\cart-bundles-api\`

---

### Bootstrap (`nest new` + config)

#### [NEW] `nest-cli.json`, `package.json`, `tsconfig.json`, `tsconfig.build.json`
Standard NestJS 11 project scaffold. Same deps as Axonelix: `drizzle-orm`, `pg`, `@nestjs/config`, `@nestjs/cache-manager`, `class-validator`, `class-transformer`, `jsonwebtoken`, `@types/jsonwebtoken`.

#### [NEW] `src/main.ts`
```
NestFactory.create(AppModule, { rawBody: true })  ← rawBody required for HMAC webhook verification
  ├── CORS: origin = process.env.ALLOWED_ORIGIN (for embed routes)
  ├── Global prefix: /api
  ├── ValidationPipe (whitelist, transform, forbidNonWhitelisted)
  ├── DatabaseExceptionFilter → GlobalExceptionFilter
  └── LoggerInterceptor
```

---

### Database (`src/database/`)

#### [NEW] `drizzle.module.ts` / `drizzle.service.ts`
Identical to Axonelix — `pg.Pool(max:20)`, `drizzle(pool, { schema })`, `OnModuleDestroy` pool close.

#### [NEW] `src/database/entities/merchants.ts`
Drizzle table: `merchants` (same columns as the Next.js entity).

#### [NEW] `src/database/entities/event-logs.ts`
Drizzle table: `event_logs`.

#### [NEW] `src/database/entities/users.ts`
Drizzle table: `users`.

#### [NEW] `src/database/schema.ts`
Exports all entities + relations object for Drizzle's typed query builder.

#### [NEW] `drizzle.config.ts`
Points to `DATABASE_URL`, schema path, migrations dir.

---

### Common (`src/common/`)

#### [NEW] `src/common/filters/global-exception.filter.ts`
Copy from Axonelix — catches everything, returns `{ statusCode, timestamp, path, message }`.

#### [NEW] `src/common/filters/database-exception.filter.ts`
Copy from Axonelix — maps PG error codes to HTTP exceptions.

#### [NEW] `src/common/interceptors/logger.interceptor.ts`
Copy from Axonelix — `METHOD URL STATUS - Xms`.

#### [NEW] `src/common/guards/embed-auth.guard.ts`
**New guard** — reads `embedToken` cookie OR `Authorization: Bearer <token>` header, calls `SallaEmbedAuthService.verifyToken()`, attaches `{ merchant_id, user_id }` to `request.embedUser`.

#### [NEW] `src/common/decorators/embed-user.decorator.ts`
`@EmbedUser()` param decorator — extracts `request.embedUser`.

#### [NEW] `src/common/decorators/is-public.decorator.ts`
`@IsPublic()` — same as Axonelix (used to opt routes out of the embed guard when applied globally, or just used selectively per-controller).

---

### Modules

#### [NEW] `src/modules/merchants/`

**`merchants.module.ts`** — imports DrizzleModule, exports MerchantsService.

**`merchants.service.ts`**:
- `getToken(merchantId)` → DB query
- `getValidAccessToken(merchantId)` → checks expiry (−5 min buffer), refreshes if needed
- `updateToken(merchantId, newToken)` → DB update
- `getNewToken(merchantId, refreshToken)` → calls `https://accounts.salla.sa/oauth2/token`

---

#### [NEW] `src/modules/embed-auth/`

**`embed-auth.module.ts`**

**`embed-auth.service.ts`**:
- `inspect(token)` → calls Salla introspection API (`https://api.salla.dev/exchange-authority/v1/introspect`)
- `createToken(data)` → `jwt.sign({ merchant_id, user_id }, JWT_SECRET, { expiresIn: '30m' })`
- `verifyToken(token)` → `jwt.verify(token, JWT_SECRET)` → typed result union

**`embed-auth.controller.ts`**:
- `GET /api/salla/embed/auth/verify?token=`
  - Calls `embedAuthService.inspect(token)`
  - Creates JWT with `embedAuthService.createToken(data)`
  - Sets HttpOnly `embedToken` cookie (`secure`, `sameSite: none`, `maxAge: 30*60`, `path: /`, `partitioned: true`)

---

#### [NEW] `src/modules/products/`

**`products.module.ts`** — imports DrizzleModule, MerchantsModule, EmbedAuthModule.

**`products.service.ts`**:
- `getProducts(accessToken, keyword?)` → `GET https://api.salla.dev/admin/v2/products`
- `applyBulkPricing(accessToken, payload)` → `POST https://api.salla.dev/admin/v2/products/actions`

**DTOs**:
- `apply-pricing.dto.ts` — `productIds: number[]`, `action: 'set_sale' | 'remove_sale'`, `discountType?`, `amount?` (with `class-validator` decorators)

**`products.controller.ts`** (two controller classes in one module):
- `EmbedProductsController` — prefix `/v1/salla/embed/products`, uses `EmbedAuthGuard`
  - `GET /` with optional `?query=` → `productsService.getProducts()`
  - `POST /discount` → validates DTO, calls `productsService.applyBulkPricing()`
- `PublicProductsController` — prefix `/v1/salla/products`, no auth
  - `GET /recommendations?storeId=&productId=` → gets token from DB, calls Salla API
  - CORS headers for `demostore.salla.sa` added manually on response

---

#### [NEW] `src/modules/webhooks/`

**`webhooks.module.ts`** — imports DrizzleModule, MerchantsModule.

**`webhooks.service.ts`**:
- `validateSignature(rawBody, signature)` → HMAC-SHA256 using `SALLA_WEBHOOK_SECRET`
- `processEvent(event)` → switch on `event.event`:
  - `app.store.authorize` → `handleAppAuthorized`
  - `app.uninstalled` → `handleAppUninstalled`
  - default → warns (does not throw)
- `handleAppAuthorized(data)` → upsert into `merchants` table
- `handleAppUninstalled(data)` → set `is_active = false`
- `logEvent(payload)` → insert into `event_logs`

**`webhooks.controller.ts`**:
- `POST /v1/salla/webhook` — `@IsPublic()`, reads raw body, validates HMAC, logs event, dispatches

---

#### [NEW] `src/modules/health/`

**`health.controller.ts`**:
- `GET /v1/db` — runs `drizzle.db.execute(sql\`select 1\`)`, returns `{ ok: true, message: "Drizzle is connected." }`

---

### App Module

#### [NEW] `src/app.module.ts`
```ts
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  CacheModule.register({ isGlobal: true, ttl: 5 * 60 * 1000 }),
  DrizzleModule,
  MerchantsModule,
  EmbedAuthModule,
  ProductsModule,
  WebhooksModule,
  HealthModule,
]
```
No global guards (embed guard is applied per-controller, not globally, since webhook and recommendations routes must be public).

---

## Open Questions

> [!IMPORTANT]
> **Where should the new backend live?**
> I'm planning to create it at `f:\Projects\UTeer\cart-bundles-api\`. Confirm or tell me a different path.

> [!IMPORTANT]
> **CORS for embed routes** — The recommendations route sets CORS for `demostore.salla.sa`. Should the embed routes also have CORS headers (for the Salla iframe context), or is the cookie/header auth sufficient there?

> [!NOTE]
> **`users` table** — It exists in the DB but none of the active API routes use it. I'll include the entity definition but won't wire a users module unless you want one.

> [!NOTE]
> **Partitioned cookie** — The Next.js app uses `partitioned: true` on the `embedToken` cookie (CHIPS). NestJS/Express doesn't have native Partitioned cookie support, so I'll set it by manually appending `; Partitioned` to the `Set-Cookie` header, same as the Next.js code does.

---

## Verification Plan

### Manual
1. `POST /api/v1/salla/webhook` with correct HMAC → merchant upserted
2. `GET /api/salla/embed/auth/verify?token=<salla_token>` → 200, `embedToken` cookie set
3. `GET /api/v1/salla/embed/products` with `embedToken` cookie → products returned
4. `POST /api/v1/salla/embed/products/discount` with valid body → pricing applied
5. `GET /api/v1/salla/products/recommendations?storeId=<id>` → products returned with CORS header
6. `GET /api/v1/db` → `{ ok: true }`
