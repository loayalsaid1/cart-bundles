# LoggingModule → five cohesive modules

This tree is your project with `modules/logging/` split into:

- **`modules/activity-log/`** — `ActivityLogModule`
  Audit trail (`activityLogs` table) + its BullMQ writer. Exports `ActivityService`.
  Also hosts `ActivityController`/`AdminActivityController` (they surface stats too,
  so this module imports `AnalyticsModule`).

- **`modules/analytics/`** — `AnalyticsModule`
  `OfferStatsService`, `DailyStatsService`, `AdminStatsService`, `MerchantHealthService`.
  Pure leaf: depends on nothing else in this split. Everything else depends on it.

- **`modules/conversion-attribution/`** — `ConversionAttributionModule`
  Order → offer matching: `CatalogCacheService`, `OfferIndexCacheService`,
  `ConversionAttributor`, matchers, `OrderConversionService`.
  Depends on `ActivityLogModule` (audit row per match) and `AnalyticsModule`
  (buffering the resulting stat deltas).

- **`modules/storefront-events/`** — `StorefrontEventsModule`
  Public rate-limited ingestion endpoint + queue worker for widget telemetry.
  Depends on `ActivityLogModule` and `AnalyticsModule`.

- **`modules/retention/`** — `RetentionModule`
  Nightly purge cron. Standalone, depends only on the database.

Dependency graph (no cycles):

```
analytics  <──  activity-log  <──  conversion-attribution
    ^                ^                       ^
    └────────────────┴── storefront-events ──┘
```

## What changed outside modules/logging

Every file that imported `LoggingModule` or reached into `modules/logging/*`
directly was repointed at the new module paths:

- `modules/auth/auth.module.ts`, `modules/auth/admin-auth.controller.ts`
- `modules/offers/offer-side-effects.module.ts`, `.service.ts`
- `modules/offers/offers.module.ts` (also dropped its **unused** `LoggingModule`
  import — `OffersService` never actually used anything from it)
- `modules/suggestions/suggestions.module.ts`, `.service.ts`
- `modules/webhooks/webhooks.module.ts`, `.service.ts`, `webhook.processor.ts`

## One thing I couldn't fix for you

Your `app.module.ts` (or whatever your root module is called) wasn't part of
the context dump I extracted this from, so I don't have it. Wherever it
currently does:

```ts
import { LoggingModule } from './modules/logging/logging.module';

@Module({
  imports: [ /* ... */ LoggingModule ],
})
```

replace that single import with the five new modules:

```ts
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ConversionAttributionModule } from './modules/conversion-attribution/conversion-attribution.module';
import { StorefrontEventsModule } from './modules/storefront-events/storefront-events.module';
import { RetentionModule } from './modules/retention/retention.module';

@Module({
  imports: [
    /* ... */
    ActivityLogModule,
    AnalyticsModule,
    ConversionAttributionModule,
    StorefrontEventsModule,
    RetentionModule,
  ],
})
```

You almost certainly don't need to import all five directly in `AppModule`
if it doesn't reference their providers directly — only import the ones
`AppModule` itself uses; the rest wire together through the imports above.

## What I verified

- All 140 files from your context dump were extracted 1:1 and are present here.
- A script walked every `.ts` file in the tree and resolved every relative
  `import ... from '...'` path against the filesystem — **0 broken imports**
  across the whole project after the move.
- No remaining references to `logging/` or `LoggingModule` anywhere.
- The one incidental cleanup: `OfferStatField` (used by both `OfferStatsService`
  and the storefront event→field map) now lives in `analytics/types/stats.types.ts`
  instead of `storefront.types.ts`, so `AnalyticsModule` stays a dependency-free
  leaf instead of reaching back into `StorefrontEventsModule` for a type.

## What I did *not* touch

Nothing outside the logging split — the caching/invalidation logic, the
offer-kind modules, webhooks, auth, everything else is byte-for-byte what
you gave me, just extracted from the markdown dump into real files.
