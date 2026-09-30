# Offer Date/Time Consistency (Asia/Riyadh)

Date: 2026-09-28
Status: approved
Scope: one implementation plan for Riyadh calendar-day parsing, unified Salla date formatting, start-date persistence and freeze rules, expiry cron alignment, frontend date pickers, and a one-shot backfill.

## Problem

Offer dates are parsed, stored, synced to Salla, shown in the dashboard, and expired by cron using three incompatible clocks.

1. Frontend `<input type="date">` sends `"YYYY-MM-DD"`. Backend `toExpiryDate` does `new Date("YYYY-MM-DD")`, which ECMAScript parses as UTC midnight. In Riyadh (UTC+3) that is 03:00 on the picked day, so a merchant who picks Oct 15 loses almost 21 hours.
2. Addon/bundle `syncToSalla` mutates midnight with `setHours(23, 59, 59)` in the Node process timezone, then `formatSallaDate` converts to Riyadh. Quantity offers skip that branch. Salla therefore receives different instants for the same stored value.
3. The expiry cron runs at 00:01 Asia/Riyadh and compares `expiryDate <= now`. Combined with UTC-midnight storage, Salla can deactivate an offer ~21 hours before our DB/storefront cache marks it expired.
4. `start_date` is not stored. Every POST and PUT sends `formatSallaStartDate()` = `now + 90s`. Editing title, products, or expiry restarts the Salla offer window.
5. Dashboard/edit forms convert stored instants with `toISOString().slice(0, 10)` or `value.slice(0, 10)`, which is the UTC calendar date, not the Riyadh calendar date.

App timezone is always Asia/Riyadh. Riyadh has no DST. Offset is `+03:00`.

## Goals

1. A calendar day picked in the UI means that Riyadh calendar day.
2. Expiry `"2026-10-15"` means end of that Riyadh day: `2026-10-15 23:59:59.999+03:00` stored as `2026-10-15T20:59:59.999Z`.
3. Start is either immediate (`now + 90s`) or a future Riyadh calendar day at `00:00:00.000+03:00`. Past calendar days are invalid. After `startDate <= now`, start is frozen.
4. DB stores UTC `timestamptz`. Salla receives `"YYYY-MM-DD HH:mm:ss"` in Asia/Riyadh from that instant. Cron and storefront compare the same UTC instant to `now`.
5. All offer kinds (quantity, addon, bundle, upgrade, recommendation) use the same parse/format path. No per-type `setHours`.
6. Existing rows: rewrite expiry to Riyadh EOD of the currently stored calendar date; fetch Salla special offers to backfill `startDate`.

Non-goals:

- Per-merchant timezones. Always Asia/Riyadh.
- Adding luxon / date-fns-tz / moment.
- Changing cron schedule (stays `1 0 * * *` Asia/Riyadh).
- Sending start/expiry to Salla for upgrade or recommendation offers (they do not sync dates today). Those kinds still persist start/expiry in our DB with the same parsers.
- Changing Salla offer types, discount payloads, or status mapping.
- Live countdown widgets on the storefront.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Expiry meaning | End of picked Riyadh day (`23:59:59.999+03:00`) |
| Approach | Dedicated `riyadh-date` module; DTOs stay thin |
| Start UX | Same pattern as expiry: "start now" checkbox **or** date picker. Picker min = tomorrow. No past days. |
| Start of a future day | `00:00:00.000+03:00` |
| Start now | Persist `now + 90s` (keep current Salla-safe offset) |
| After start has passed | Start is frozen; UI locked; PUT must not send a new start |
| Existing expiry | Backfill to Riyadh EOD of the stored calendar date |
| Existing start | Fetch each linked Salla special offer; persist its `start_date`. Fallback `createdAt` if missing / fetch fails |

## Current state (constraints)

- NestJS backend is source of truth. Frontend Next.js date inputs live in `general-info-step.tsx`.
- `offers.expiryDate`: `timestamp('expiry_date', { withTimezone: true })`. No `startDate` column.
- Parsing: `Back-End/src/modules/offers/dto/common-offer.dto.ts` `toExpiryDate` / `formatSallaDate` / `formatSallaStartDate`.
- Salla sync only in quantity, addon, bundle services. Each duplicates start/expiry formatting. Addon/bundle share a midnight `setHours` workaround; quantity does not.
- Upgrade and recommendation persist `expiryDate` via `toExpiryDate` but never call Salla special-offers.
- Cron: `OfferExpirationService` `@Cron('1 0 * * *', { timeZone: 'Asia/Riyadh' })` then `lte(offers.expiryDate, now)` with `now = new Date()`.
- Storefront listing filters `status = 'active'` only; it does not compare `expiryDate` at read time. Correct stored expiry + cron is what keeps storefront honest between cron ticks (an offer whose expiry is still in the future stays active).
- Frontend transformers: `toDateInput` = `value.slice(0, 10)`. Date input display: `d.toISOString().slice(0, 10)`. "No expiry" default: `new Date().toISOString().slice(0, 10)`.
- Existing backend tests use Jest. Date util must have a Jest spec. No date library in `package.json`.
- Drizzle migrations: `Back-End/drizzle/0000_*.sql` … `0002_*.sql`. Next file is `0003_*.sql`.
- One-shot data scripts live in `Back-End/scripts/` and are wired as `db:backfill-*` npm scripts. Follow `backfill-merchant-profiles.ts` (dotenv, Pool, fail-soft per row).

## Architecture

Timezone policy is one module. Everything else calls it.

```text
Merchant UI (YYYY-MM-DD + "start now" / "no expiry")
        |
        v
Offer DTOs (validate calendar string / omit)
        |
        v
src/common/time/riyadh-date.ts     <-- only place that knows Riyadh
        |
        v
offers.start_date / offers.expiry_date   (timestamptz UTC)
        |
        +--> salla-offer-dates.ts --> start_date / expiry_date strings
        +--> cron: expiryDate <= now()
        +--> API ISO instants --> FE toRiyadhCalendarDate()
```

| Unit | Responsibility | Does not do |
|---|---|---|
| `riyadh-date.ts` | Parse Riyadh start/end of calendar day; format Riyadh wall time; calendar-date round-trip; `immediateStart`; `isStartFrozen` | HTTP, Drizzle, Salla payloads, validation messages |
| `common-offer.dto.ts` | Validate incoming strings; map DTO fields through `riyadh-date` | Own timezone math or `setHours` |
| `salla-offer-dates.ts` | `{ start_date, expiry_date? }` from stored instants | Fetch tokens, build buy/get payload |
| Quantity/addon/bundle `syncToSalla` | Build Salla commercial payload; attach dates from helper | Date parsing |
| Offer create/update services (all 5 kinds) | Resolve start (now vs calendar vs frozen); persist UTC | Inline `new Date(value)` |
| `OfferExpirationService` | Mark active rows expired when `expiryDate <= now` | Re-parse calendar days |
| Backfill script | Rewrite expiry; GET Salla offer for start | Change running request path |
| Frontend `riyadh-date.ts` | Calendar-date for inputs; min=tomorrow; never UTC-slice | Talk to Salla |

`formatSallaDate` / `formatSallaStartDate` move out of the DTO file. DTO keeps thin wrappers only if call sites would otherwise churn; prefer importing from `riyadh-date` / `salla-offer-dates` directly.

## Schema

Add nullable start column next to expiry:

```ts
startDate: timestamp('start_date', { withTimezone: true }),
expiryDate: timestamp('expiry_date', { withTimezone: true }),
```

- `startDate` null means "not yet resolved" (legacy row before backfill, or draft that chose "start now" but has never been persisted through the new path). Create path always writes a non-null start (see data flow).
- Drizzle migration `0003_*`: `ALTER TABLE offers ADD COLUMN start_date timestamp with time zone;`
- Types: `Offer` / `NewOffer` pick it up from `InferSelectModel`. `DashboardOfferShort` may include `startDate` if the list shows it; not required for v1 list (expiry column already exists). Edit payloads need it.

No check constraint `start < expiry` in SQL. Enforce in DTO/service so the error is a `validation_error` the UI can show. Null expiry remains valid (no end).

## Data flow

### Inbound calendar strings

Frontend sends:

- `info.expiryDate?: string` — `"YYYY-MM-DD"` or omitted (no expiry). Same as today.
- `info.startNow: boolean` — default `true`.
- `info.startDate?: string` — `"YYYY-MM-DD"`, only when `startNow === false`. Must be strictly after today's Riyadh calendar date.

Backend:

```ts
expiryDate = info.expiryDate
  ? parseRiyadhEndOfDay(info.expiryDate)
  : null;

startDate = existing && isStartFrozen(existing.startDate, now)
  ? existing.startDate
  : info.startNow
    ? immediateStart(now)          // now + 90_000 ms
    : parseRiyadhStartOfDay(info.startDate);
```

Reject if:

- `startNow === false` and `startDate` missing / not `YYYY-MM-DD`.
- Parsed start calendar date `<=` today's Riyadh date (picker min is tomorrow; backend still enforces).
- Both start and expiry present and `startDate >= expiryDate`.
- Frozen start and client sent a different start (`startNow` flip or a new calendar day): ignore client start, keep stored. Do not 400 — silent preserve is simpler for a stale form. Log at debug.

`toExpiryDate` becomes:

```ts
export function toExpiryDate(value?: string): Date | null {
  if (!value) return null;
  return parseRiyadhEndOfDay(value);
}
```

`parseRiyadhEndOfDay` / `parseRiyadhStartOfDay` throw or return null on non-`YYYY-MM-DD`. DTO `@IsISO8601()` currently accepts date-only and full ISO. Keep accepting date-only. If a full ISO instant arrives (old client / tests), parse as an absolute instant and do not re-interpret as a calendar day. Date-only is the merchant path; ISO is the escape hatch.

### Persistence

All five offer services write `startDate` and `expiryDate` on create and update. Upgrade/recommendation do not sync those fields to Salla; they still store them so dashboard, cron, and a future Salla sync stay consistent.

### Outbound API

JSON serializes `Date` as ISO-8601 UTC (`...Z`). Frontend never slices UTC. It calls `toRiyadhCalendarDate(iso)` for the date input value.

### Salla

Shared helper:

```ts
function sallaOfferDates(offer: { startDate: Date | null; expiryDate: Date | null }, now = new Date()) {
  const start = offer.startDate ?? immediateStart(now);
  return {
    start_date: formatRiyadhDateTime(start),
    expiry_date: offer.expiryDate ? formatRiyadhDateTime(offer.expiryDate) : undefined,
  };
}
```

Quantity, addon, bundle `syncToSalla` delete local `formatSallaStartDate()` / `setHours` blocks and spread this object into the payload.

If `startDate` is frozen, still send the stored instant (not `now+90s`). That is the whole point of persistence.

`formatRiyadhDateTime` is the current `formatSallaDate` body (Intl `Asia/Riyadh`, hour `'24'` -> `'00'`). Move it; do not rewrite the formatter.

### Cron / storefront

Cron stays as-is: `now = new Date()`, `lte(offers.expiryDate, now)`. After backfill, Oct 15 expiry is `2026-10-15T20:59:59.999Z`. Cron at 00:01 Riyadh on Oct 16 (`2026-10-15T21:01:00Z`) expires it. Salla received `2026-10-15 23:59:59`, so both sides end the same Riyadh day.

Do not add an extra `expiryDate > now` filter on storefront reads in this spec. Cron + correct storage is enough; a read-time filter is a follow-up if we need sub-day precision between cron ticks. (Worst case after this fix: an offer stays in cache until 00:01 the next Riyadh day, i.e. about one minute past expiry, not 21 hours.)

## Riyadh date module

File: `Back-End/src/common/time/riyadh-date.ts`

Constants:

```ts
export const APP_TIMEZONE = 'Asia/Riyadh';
export const RIYADH_OFFSET = '+03:00';
export const IMMEDIATE_START_DELAY_MS = 90_000;
```

Functions (pure, no Nest inject):

| Function | Input | Output |
|---|---|---|
| `parseRiyadhStartOfDay(day)` | `"YYYY-MM-DD"` | `Date` for `YYYY-MM-DDT00:00:00.000+03:00` |
| `parseRiyadhEndOfDay(day)` | `"YYYY-MM-DD"` | `Date` for `YYYY-MM-DDT23:59:59.999+03:00` |
| `toRiyadhCalendarDate(d)` | `Date` | `"YYYY-MM-DD"` in Asia/Riyadh |
| `formatRiyadhDateTime(d)` | `Date` | `"YYYY-MM-DD HH:mm:ss"` in Asia/Riyadh (Salla) |
| `immediateStart(now)` | `Date` | `now + 90s` |
| `isStartFrozen(start, now)` | `Date \| null, Date` | `true` if `start != null && start.getTime() <= now.getTime()` |
| `riyadhToday(now)` | `Date` | today's `"YYYY-MM-DD"` in Riyadh |
| `isRiyadhCalendarDate(s)` | `string` | type guard `YYYY-MM-DD` |

Implementation note: construct instants with `new Date(`${day}T00:00:00.000+03:00`)` / `...T23:59:59.999+03:00`. Do not use `Date.UTC` then subtract 3 hours in a way that depends on `getHours()` (local TZ of the process). Tests must not assume the host TZ is UTC; they assert `.toISOString()`.

Invalid `YYYY-MM-DD` (e.g. `2026-13-40`) -> `null`. Callers treat null as validation failure.

Frontend twin: `Front-End/lib/utils/riyadh-date.ts` with `toRiyadhCalendarDate`, `riyadhToday`, `riyadhTomorrow` (today + 1 Riyadh day). No Salla formatter on the FE. Keep functions small and duplicated rather than sharing a package — this repo has no shared lib.

## Start / expiry rules (service layer)

Resolve start in one function used by all five create/update paths:

```ts
function resolveStartDate(opts: {
  existingStart: Date | null | undefined;
  startNow: boolean;
  startDate?: string;
  now?: Date;
}): Date
```

Rules, in order:

1. If `existingStart` is frozen -> return `existingStart`.
2. If `startNow` -> return `immediateStart(now)`.
3. Else parse `startDate` as Riyadh start-of-day; if calendar date `<= riyadhToday(now)` -> validation error.
4. Return parsed start.

Create always has no `existingStart`, so step 1 never fires.

Expiry: `toExpiryDate(info.expiryDate)` (Riyadh EOD or null). Independent of freeze.

If start and expiry both set and `start >= expiry` -> `validation_error`.

## Frontend

`general-info-step.tsx` gains a start block mirroring expiry:

- Checkbox "Start immediately" bound to `info.startNow` (default `true`).
- Date input enabled when `startNow === false`. `min` = tomorrow Riyadh. `value` = `toRiyadhCalendarDate` of stored start, or tomorrow if empty.
- When frozen (`startDate` present and `<= now`): checkbox + input disabled; show the stored Riyadh calendar date (or "Started immediately" if we only have an instant that is not midnight — display `toRiyadhCalendarDate(startDate)` plus time is unnecessary; date is enough).
- Expiry input: `toRiyadhCalendarDate` instead of `toISOString().slice(0, 10)`. "No expiry" unchecked default = `riyadhToday()`, not UTC today.
- Expiry `min` = selected start calendar date (or today if start now), so the UI cannot pick expiry before start. Backend still validates.

`offerInfoSchema`:

```ts
startNow: z.boolean().optional().default(true),
startDate: z.string().optional(),
expiryDate: z.string().optional(),
```

Transformers (`offer-transformers.ts`): map `offer.startDate` -> `info.startNow` / `info.startDate`. If `startDate` is null, `startNow = true`. If stored start is frozen, `startNow = false` and `startDate = toRiyadhCalendarDate(offer.startDate)` (input disabled). If stored start is still in the future and is Riyadh midnight, `startNow = false` and calendar day filled. If stored start is in the future but not midnight (legacy `now+90s` that has not fired yet), treat as `startNow = true` so the merchant is not shown a confusing date.

`offer-master-list.tsx`: format expiry with Riyadh calendar date (`toRiyadhCalendarDate` or `toLocaleDateString('en-GB', { timeZone: 'Asia/Riyadh' })`), not host locale midnight.

i18n (`messages/en.json`, `messages/ar.json`) under `Offers.info`:

- `startNow`: "Start immediately" / Arabic equivalent
- `startDate`: "Start date"
- `startFrozen`: "Start date cannot be changed after the offer has started"

## Backfill

Script: `Back-End/scripts/backfill-offer-dates.ts`
npm: `"db:backfill-offer-dates": "ts-node --transpile-only scripts/backfill-offer-dates.ts"`

Idempotent. Safe to re-run.

### Expiry rewrite

For each offer with non-null `expiry_date`:

1. `cal = toRiyadhCalendarDate(expiry_date)` using **current** stored instant. Existing UTC-midnight `2026-10-15T00:00:00.000Z` is `2026-10-15` in Riyadh (03:00). That is the merchant's picked day.
2. `newExpiry = parseRiyadhEndOfDay(cal)` → `2026-10-15T20:59:59.999Z`.
3. Skip update if already equal (re-run).
4. Edge: if someone already stored a non-midnight instant, still map through calendar date then EOD. One canonical form.

Do this in SQL/JS in the script, not a drizzle default. Batch updates are fine; volume is merchant offers, not millions of events.

### Start rewrite

For each offer:

1. If `start_date` already non-null, skip (idempotent).
2. If `salla_offer_id` is null (upgrade, recommendation, never-synced draft): `start_date = created_at`.
3. Else `GET https://api.salla.dev/admin/v2/specialoffers/{sallaOfferId}` with `getValidAccessToken`. Parse `data.start_date` / `data.startDate` (confirm field name against a real payload; accept both). Interpret Salla's naive `"YYYY-MM-DD HH:mm:ss"` as Asia/Riyadh wall time: `new Date(s.replace(' ', 'T') + '+03:00')`. Persist.
4. On 404 / 401 / network / missing field: `start_date = created_at`, log warning, continue. Same fail-soft as merchant-profile backfill.
5. Rate-limit: sequential per merchant is enough; no parallel storm.

Do not PUT back to Salla during backfill. Dates in Salla stay as they are; we only copy start into our DB so the next merchant edit preserves it.

Token access: script should reuse `MerchantsService.getValidAccessToken` if bootstrapping Nest is reasonable; otherwise copy the token-read pattern from `backfill-merchant-profiles.ts` (raw access token on the merchant row). Prefer Nest bootstrap only if token refresh is required for a large inactive-token set; otherwise keep the script a plain `ts-node` file like the existing ones.

## Error handling

- Invalid calendar string -> `400 validation_error`, no partial write.
- Start after freeze from a confused client -> ignore start fields, persist other edits.
- Salla PUT/POST failure on create/update: existing `salla_sync_failed` path unchanged.
- Backfill fetch failure: fallback `createdAt`, never abort the whole run.
- `parseRiyadh*` null -> treat as validation, never insert `Invalid Date`.

## Testing

Jest: `Back-End/src/common/time/riyadh-date.spec.ts`

Must cover:

- `parseRiyadhEndOfDay('2026-10-15').toISOString() === '2026-10-15T20:59:59.999Z'`
- `parseRiyadhStartOfDay('2026-10-16').toISOString() === '2026-10-15T21:00:00.000Z'`
- `toRiyadhCalendarDate(new Date('2026-10-15T20:59:59.999Z')) === '2026-10-15'`
- `toRiyadhCalendarDate(new Date('2026-10-15T21:00:00.000Z')) === '2026-10-16'` (UTC slice would wrongly return `2026-10-15`)
- `formatRiyadhDateTime(parseRiyadhEndOfDay('2026-10-15')) === '2026-10-15 23:59:59'`
- `immediateStart` offset 90_000 ms
- `isStartFrozen` true/false/null
- Invalid strings -> null

Frontend: extend `offer-transformers.test.ts` so drafts get `startNow` / `startDate` from a frozen vs future `startDate`. Add a small test for `toRiyadhCalendarDate` if the FE helper is non-trivial.

No need to e2e Salla in this spec. `salla-offer-dates` can be a one-liner unit test: given expiry instant, payload string matches formatter.

## Migration / rollout

1. Land code + drizzle `0003` adding `start_date` (nullable).
2. Deploy. Running app writes new start/expiry correctly. Old rows still have UTC-midnight expiry until backfill; cron behavior for those rows is unchanged until step 3.
3. Run `pnpm db:backfill-offer-dates` once per environment.
4. Re-run is a no-op for already-canonical rows.

Do not mix backfill SQL into the drizzle migration. Schema change is migration; data repair is the script. Matches `db:backfill-merchant-profiles`.

## Files touched (expected)

Backend:

- `src/common/time/riyadh-date.ts` (new)
- `src/common/time/riyadh-date.spec.ts` (new)
- `src/modules/offers/salla-offer-dates.ts` (new)
- `src/modules/offers/dto/common-offer.dto.ts` (thin `toExpiryDate`; remove formatters)
- `src/modules/offers/resolve-start-date.ts` (new, or colocated with dto if tiny)
- `src/database/entities/offers.ts` + generated drizzle snapshot
- `drizzle/0003_*.sql`
- quantity / addon / bundle / upgrade / recommendation offer services (persist start; Salla kinds use helper)
- `scripts/backfill-offer-dates.ts`
- `package.json` script entry

Frontend:

- `lib/utils/riyadh-date.ts` (new)
- `lib/schemas/common-offer.ts`
- `lib/utils/offer-transformers.ts` + test
- `components/offers/builder/steps/general-info-step.tsx`
- `components/offers/offer-master-list.tsx`
- `messages/en.json`, `messages/ar.json`

Unchanged: cron schedule, storefront query, Salla commercial payload shape.

## Spec self-review

- No TBD/TODO left for implementation-critical behavior. Salla GET JSON field is specified as `start_date` with `startDate` alias.
- Architecture matches the locked approach A (dedicated module, no new date lib).
- Start freeze vs "start now" vs calendar day is one function, one order of rules.
- Backfill expiry uses Riyadh calendar of the **stored** instant so UTC midnight Oct 15 stays Oct 15, not Oct 14.
- UTC-slice bug on the frontend is in scope; otherwise EOD storage would display as the previous day in the picker.
- Upgrade/recommendation persist dates but do not sync to Salla — explicit, not an accident.
)
