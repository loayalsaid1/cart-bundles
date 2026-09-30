# Offer Date/Time Consistency (Asia/Riyadh) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse, store, sync, display, and expire offer start/expiry dates as Asia/Riyadh calendar days (UTC instants in Postgres), with a frozen start date after it has begun.

**Architecture:** One pure module (`src/common/time/riyadh-date.ts`) owns timezone math. DTOs validate strings. `offerScheduleFields` resolves start (now vs calendar vs frozen) and expiry (Riyadh EOD). Quantity/addon/bundle attach Salla strings via `sallaOfferDates`. Frontend twin formats ISO instants back to Riyadh `YYYY-MM-DD`. A one-shot script backfills old UTC-midnight expiry rows and fetches Salla `start_date`.

**Tech Stack:** NestJS 11, Drizzle ORM, PostgreSQL `timestamptz`, Jest (backend), node:test (frontend), Next.js 16, Zod, next-intl. No date libraries.

## Global Constraints

- App timezone is always `Asia/Riyadh`. Offset `+03:00`. No DST. No luxon/date-fns-tz/moment.
- Calendar day `"YYYY-MM-DD"` on expiry means `23:59:59.999+03:00`. Future start day means `00:00:00.000+03:00`. Immediate start is `now + 90_000` ms.
- Past start calendar days are invalid. After `startDate <= now`, start is frozen (ignore client start fields; do not 400).
- DB stores UTC `timestamptz`. Salla gets `"YYYY-MM-DD HH:mm:ss"` in Asia/Riyadh from that instant.
- Cron schedule stays `@Cron('1 0 * * *', { timeZone: 'Asia/Riyadh' })`. Do not add a storefront `expiryDate > now` filter.
- Upgrade and recommendation persist start/expiry but do not sync them to Salla.
- Do not mix data backfill into the drizzle migration. Schema = migration; data = `scripts/backfill-offer-dates.ts`.
- No comments in new/edited code unless the user asked. No emojis.

## File map

| File | Role |
|---|---|
| `Back-End/src/common/time/riyadh-date.ts` | Parse/format Riyadh calendar days and instants |
| `Back-End/src/common/time/riyadh-date.spec.ts` | Jest coverage for the module |
| `Back-End/src/modules/offers/resolve-start-date.ts` | `offerScheduleFields` / freeze / start-now vs calendar |
| `Back-End/src/modules/offers/resolve-start-date.spec.ts` | Jest coverage for schedule resolution |
| `Back-End/src/modules/offers/salla-offer-dates.ts` | `{ start_date, expiry_date? }` for Salla payloads |
| `Back-End/src/modules/offers/salla-offer-dates.spec.ts` | Jest coverage for Salla strings |
| `Back-End/src/modules/offers/dto/common-offer.dto.ts` | `startNow` / `startDate` fields; thin `toExpiryDate` |
| `Back-End/src/database/entities/offers.ts` | `startDate` column |
| `Back-End/drizzle/0003_offer_start_date.sql` | `ALTER TABLE` |
| quantity / addon / bundle / upgrade / recommendation `*.service.ts` | Persist schedule; Salla kinds use helper |
| `Front-End/lib/utils/riyadh-date.ts` | Calendar-date helpers for inputs |
| `Front-End/lib/utils/riyadh-date.test.ts` | node:test |
| `Front-End/lib/schemas/common-offer.ts` | `startNow` / `startDate` on info |
| `Front-End/lib/utils/offer-transformers.ts` | Map stored start onto draft info |
| `Front-End/components/offers/builder/steps/general-info-step.tsx` | Start checkbox + date picker |
| `Front-End/components/offers/offer-master-list.tsx` | Riyadh expiry display |
| `Front-End/messages/en.json` / `ar.json` | Copy |
| `Back-End/scripts/backfill-offer-dates.ts` | Expiry EOD rewrite + Salla start fetch |

---

### Task 1: Backend `riyadh-date` module

**Files:**
- Create: `Back-End/src/common/time/riyadh-date.spec.ts`
- Create: `Back-End/src/common/time/riyadh-date.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `APP_TIMEZONE: 'Asia/Riyadh'`
  - `RIYADH_OFFSET: '+03:00'`
  - `IMMEDIATE_START_DELAY_MS: 90_000`
  - `isRiyadhCalendarDate(value: string): boolean`
  - `parseRiyadhStartOfDay(day: string): Date | null`
  - `parseRiyadhEndOfDay(day: string): Date | null`
  - `toRiyadhCalendarDate(d: Date): string`
  - `formatRiyadhDateTime(d: Date): string`
  - `immediateStart(now: Date): Date`
  - `isStartFrozen(start: Date | null | undefined, now: Date): boolean`
  - `riyadhToday(now: Date): string`

- [ ] **Step 1: Write the failing test**

Create `Back-End/src/common/time/riyadh-date.spec.ts`:

```ts
import {
  formatRiyadhDateTime,
  immediateStart,
  isRiyadhCalendarDate,
  isStartFrozen,
  parseRiyadhEndOfDay,
  parseRiyadhStartOfDay,
  riyadhToday,
  toRiyadhCalendarDate,
} from './riyadh-date';

describe('riyadh-date', () => {
  it('parses end of Riyadh day to UTC', () => {
    expect(parseRiyadhEndOfDay('2026-10-15')?.toISOString()).toBe(
      '2026-10-15T20:59:59.999Z',
    );
  });

  it('parses start of Riyadh day to UTC', () => {
    expect(parseRiyadhStartOfDay('2026-10-16')?.toISOString()).toBe(
      '2026-10-15T21:00:00.000Z',
    );
  });

  it('round-trips EOD instant to the same calendar date', () => {
    const d = parseRiyadhEndOfDay('2026-10-15');
    expect(toRiyadhCalendarDate(d!)).toBe('2026-10-15');
  });

  it('does not UTC-slice a Riyadh midnight into the previous day', () => {
    expect(
      toRiyadhCalendarDate(new Date('2026-10-15T21:00:00.000Z')),
    ).toBe('2026-10-16');
  });

  it('formats Salla wall time from EOD instant', () => {
    expect(formatRiyadhDateTime(parseRiyadhEndOfDay('2026-10-15')!)).toBe(
      '2026-10-15 23:59:59',
    );
  });

  it('formats Salla wall time from start-of-day instant', () => {
    expect(formatRiyadhDateTime(parseRiyadhStartOfDay('2026-10-16')!)).toBe(
      '2026-10-16 00:00:00',
    );
  });

  it('adds 90 seconds for immediate start', () => {
    const now = new Date('2026-10-15T12:00:00.000Z');
    expect(immediateStart(now).toISOString()).toBe(
      '2026-10-15T12:01:30.000Z',
    );
  });

  it('freezes start at or before now', () => {
    const now = new Date('2026-10-15T12:00:00.000Z');
    expect(isStartFrozen(new Date('2026-10-15T11:59:59.000Z'), now)).toBe(
      true,
    );
    expect(isStartFrozen(now, now)).toBe(true);
    expect(isStartFrozen(new Date('2026-10-15T12:00:01.000Z'), now)).toBe(
      false,
    );
    expect(isStartFrozen(null, now)).toBe(false);
    expect(isStartFrozen(undefined, now)).toBe(false);
  });

  it('returns today in Riyadh', () => {
    expect(riyadhToday(new Date('2026-10-15T21:00:00.000Z'))).toBe(
      '2026-10-16',
    );
    expect(riyadhToday(new Date('2026-10-15T20:59:59.000Z'))).toBe(
      '2026-10-15',
    );
  });

  it('rejects invalid calendar strings', () => {
    expect(isRiyadhCalendarDate('2026-10-15')).toBe(true);
    expect(isRiyadhCalendarDate('2026-13-40')).toBe(false);
    expect(isRiyadhCalendarDate('2026-10-15T00:00:00Z')).toBe(false);
    expect(parseRiyadhEndOfDay('nope')).toBeNull();
    expect(parseRiyadhStartOfDay('2026-13-40')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /workspace/Back-End && pnpm test -- src/common/time/riyadh-date.spec.ts`

Expected: FAIL (cannot find module `./riyadh-date`).

- [ ] **Step 3: Write minimal implementation**

Create `Back-End/src/common/time/riyadh-date.ts`:

```ts
export const APP_TIMEZONE = 'Asia/Riyadh';
export const RIYADH_OFFSET = '+03:00';
export const IMMEDIATE_START_DELAY_MS = 90_000;

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRiyadhCalendarDate(value: string): boolean {
  return parseRiyadhStartOfDay(value) !== null;
}

function parseRiyadhInstant(
  day: string,
  time: '00:00:00.000' | '23:59:59.999',
): Date | null {
  if (!CALENDAR_DATE.test(day)) return null;
  const parsed = new Date(`${day}T${time}${RIYADH_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (toRiyadhCalendarDate(parsed) !== day) return null;
  return parsed;
}

export function parseRiyadhStartOfDay(day: string): Date | null {
  return parseRiyadhInstant(day, '00:00:00.000');
}

export function parseRiyadhEndOfDay(day: string): Date | null {
  return parseRiyadhInstant(day, '23:59:59.999');
}

export function toRiyadhCalendarDate(d: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

export function formatRiyadhDateTime(d: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(d).map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}:${parts.second}`;
}

export function immediateStart(now: Date): Date {
  return new Date(now.getTime() + IMMEDIATE_START_DELAY_MS);
}

export function isStartFrozen(
  start: Date | null | undefined,
  now: Date,
): boolean {
  return start != null && start.getTime() <= now.getTime();
}

export function riyadhToday(now: Date): string {
  return toRiyadhCalendarDate(now);
}
```

`parseRiyadhInstant` rejects `2026-13-40` because `toRiyadhCalendarDate` of the overflowed Date will not equal the input day.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /workspace/Back-End && pnpm test -- src/common/time/riyadh-date.spec.ts`

Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add Back-End/src/common/time/riyadh-date.ts Back-End/src/common/time/riyadh-date.spec.ts
git commit -m "$(cat <<'EOF'
feat(time): add Asia/Riyadh calendar-day helpers

Parse start/end of Riyadh day to UTC instants and format Salla wall time without depending on process timezone.
EOF
)"
```

---

### Task 2: Schedule resolution (`offerScheduleFields`)

**Files:**
- Create: `Back-End/src/modules/offers/resolve-start-date.spec.ts`
- Create: `Back-End/src/modules/offers/resolve-start-date.ts`

**Interfaces:**
- Consumes: `parseRiyadhStartOfDay`, `parseRiyadhEndOfDay`, `immediateStart`, `isStartFrozen`, `riyadhToday` from Task 1
- Produces:
  - `OfferScheduleInfo = { startNow?: boolean; startDate?: string; expiryDate?: string }`
  - `OfferScheduleResult = { ok: true; startDate: Date; expiryDate: Date | null } | { ok: false; error: string }`
  - `offerScheduleFields(info, existingStart?, now?): OfferScheduleResult`

- [ ] **Step 1: Write the failing test**

Create `Back-End/src/modules/offers/resolve-start-date.spec.ts`:

```ts
import { offerScheduleFields } from './resolve-start-date';

const now = new Date('2026-10-15T12:00:00.000Z');

describe('offerScheduleFields', () => {
  it('defaults to immediate start and null expiry', () => {
    const result = offerScheduleFields({}, undefined, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.startDate.toISOString()).toBe('2026-10-15T12:01:30.000Z');
    expect(result.expiryDate).toBeNull();
  });

  it('parses expiry as Riyadh end of day', () => {
    const result = offerScheduleFields(
      { expiryDate: '2026-10-20' },
      undefined,
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.expiryDate?.toISOString()).toBe(
      '2026-10-20T20:59:59.999Z',
    );
  });

  it('parses a future calendar start as Riyadh midnight', () => {
    const result = offerScheduleFields(
      { startNow: false, startDate: '2026-10-16' },
      undefined,
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.startDate.toISOString()).toBe('2026-10-15T21:00:00.000Z');
  });

  it('rejects startNow false without a date', () => {
    const result = offerScheduleFields({ startNow: false }, undefined, now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/start date/i);
  });

  it('rejects a start calendar day that is today or earlier in Riyadh', () => {
    const result = offerScheduleFields(
      { startNow: false, startDate: '2026-10-15' },
      undefined,
      now,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects start at or after expiry', () => {
    const result = offerScheduleFields(
      { startNow: false, startDate: '2026-10-20', expiryDate: '2026-10-16' },
      undefined,
      now,
    );
    expect(result.ok).toBe(false);
  });

  it('keeps a frozen existing start and ignores client start fields', () => {
    const existing = new Date('2026-10-01T00:00:00.000Z');
    const result = offerScheduleFields(
      { startNow: false, startDate: '2026-10-20', expiryDate: '2026-10-25' },
      existing,
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.startDate.toISOString()).toBe(existing.toISOString());
    expect(result.expiryDate?.toISOString()).toBe(
      '2026-10-25T20:59:59.999Z',
    );
  });

  it('allows replacing an unfrozen existing start', () => {
    const existing = new Date('2026-10-20T00:00:00.000Z');
    const result = offerScheduleFields(
      { startNow: true },
      existing,
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.startDate.toISOString()).toBe('2026-10-15T12:01:30.000Z');
  });

  it('parses a full ISO expiry as an absolute instant', () => {
    const result = offerScheduleFields(
      { expiryDate: '2026-10-15T18:00:00.000Z' },
      undefined,
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.expiryDate?.toISOString()).toBe(
      '2026-10-15T18:00:00.000Z',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /workspace/Back-End && pnpm test -- src/modules/offers/resolve-start-date.spec.ts`

Expected: FAIL (cannot find module).

- [ ] **Step 3: Write minimal implementation**

Create `Back-End/src/modules/offers/resolve-start-date.ts`:

```ts
import {
  immediateStart,
  isStartFrozen,
  parseRiyadhEndOfDay,
  parseRiyadhStartOfDay,
  riyadhToday,
} from '../../common/time/riyadh-date';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type OfferScheduleInfo = {
  startNow?: boolean;
  startDate?: string;
  expiryDate?: string;
};

export type OfferScheduleResult =
  | { ok: true; startDate: Date; expiryDate: Date | null }
  | { ok: false; error: string };

function toExpiryDate(value?: string): Date | null {
  if (!value) return null;
  if (DATE_ONLY.test(value)) return parseRiyadhEndOfDay(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function offerScheduleFields(
  info: OfferScheduleInfo,
  existingStart?: Date | null,
  now: Date = new Date(),
): OfferScheduleResult {
  const expiryDate = toExpiryDate(info.expiryDate);
  if (info.expiryDate && !expiryDate) {
    return { ok: false, error: 'Invalid expiry date' };
  }

  let startDate: Date;
  if (isStartFrozen(existingStart, now)) {
    startDate = existingStart as Date;
  } else {
    const startNow = info.startNow !== false;
    if (startNow) {
      startDate = immediateStart(now);
    } else {
      if (!info.startDate) {
        return { ok: false, error: 'Start date is required' };
      }
      const parsed = DATE_ONLY.test(info.startDate)
        ? parseRiyadhStartOfDay(info.startDate)
        : (() => {
            const d = new Date(info.startDate);
            return Number.isNaN(d.getTime()) ? null : d;
          })();
      if (!parsed) {
        return { ok: false, error: 'Invalid start date' };
      }
      if (DATE_ONLY.test(info.startDate) && info.startDate <= riyadhToday(now)) {
        return {
          ok: false,
          error: 'Start date must be tomorrow or later',
        };
      }
      startDate = parsed;
    }
  }

  if (expiryDate && startDate.getTime() >= expiryDate.getTime()) {
    return { ok: false, error: 'Start date must be before expiry date' };
  }

  return { ok: true, startDate, expiryDate };
}
```

Default: omitted `startNow` means immediate (`!== false`). Frozen existing start skips client fields.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /workspace/Back-End && pnpm test -- src/modules/offers/resolve-start-date.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add Back-End/src/modules/offers/resolve-start-date.ts Back-End/src/modules/offers/resolve-start-date.spec.ts
git commit -m "$(cat <<'EOF'
feat(offers): resolve start/expiry in Riyadh with freeze rules

Immediate start is now+90s, future days are Riyadh midnight, and a start that has already begun is preserved.
EOF
)"
```

---

### Task 3: Salla date helper and thin DTO wrappers

**Files:**
- Create: `Back-End/src/modules/offers/salla-offer-dates.spec.ts`
- Create: `Back-End/src/modules/offers/salla-offer-dates.ts`
- Modify: `Back-End/src/modules/offers/dto/common-offer.dto.ts`

**Interfaces:**
- Consumes: `formatRiyadhDateTime`, `immediateStart` from Task 1
- Produces:
  - `sallaOfferDates(offer, now?): { start_date: string; expiry_date?: string }`
  - `toExpiryDate(value?: string): Date | null` remains exported from the DTO file as a date-only → Riyadh EOD wrapper (ISO instants pass through)

- [ ] **Step 1: Write the failing test**

Create `Back-End/src/modules/offers/salla-offer-dates.spec.ts`:

```ts
import { sallaOfferDates } from './salla-offer-dates';

describe('sallaOfferDates', () => {
  const now = new Date('2026-10-15T12:00:00.000Z');

  it('formats stored instants in Riyadh wall time', () => {
    const result = sallaOfferDates(
      {
        startDate: new Date('2026-10-15T21:00:00.000Z'),
        expiryDate: new Date('2026-10-20T20:59:59.999Z'),
      },
      now,
    );
    expect(result.start_date).toBe('2026-10-16 00:00:00');
    expect(result.expiry_date).toBe('2026-10-20 23:59:59');
  });

  it('omits expiry when null', () => {
    const result = sallaOfferDates(
      { startDate: new Date('2026-10-15T12:01:30.000Z'), expiryDate: null },
      now,
    );
    expect(result.start_date).toBe('2026-10-15 15:01:30');
    expect(result.expiry_date).toBeUndefined();
  });

  it('falls back to immediate start when startDate is null', () => {
    const result = sallaOfferDates(
      { startDate: null, expiryDate: null },
      now,
    );
    expect(result.start_date).toBe('2026-10-15 15:01:30');
  });
});
```

Also add to the same file (or keep in `riyadh-date.spec` — prefer a small DTO test here is unnecessary; `toExpiryDate` is retested via `offerScheduleFields`). Skip a separate DTO spec.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /workspace/Back-End && pnpm test -- src/modules/offers/salla-offer-dates.spec.ts`

Expected: FAIL (cannot find module).

- [ ] **Step 3: Write helper and slim the DTO**

Create `Back-End/src/modules/offers/salla-offer-dates.ts`:

```ts
import {
  formatRiyadhDateTime,
  immediateStart,
} from '../../common/time/riyadh-date';

export function sallaOfferDates(
  offer: {
    startDate: Date | string | null;
    expiryDate: Date | string | null;
  },
  now: Date = new Date(),
): { start_date: string; expiry_date?: string } {
  const start =
    offer.startDate == null
      ? immediateStart(now)
      : new Date(offer.startDate);
  const result: { start_date: string; expiry_date?: string } = {
    start_date: formatRiyadhDateTime(start),
  };
  if (offer.expiryDate != null) {
    result.expiry_date = formatRiyadhDateTime(new Date(offer.expiryDate));
  }
  return result;
}
```

In `Back-End/src/modules/offers/dto/common-offer.dto.ts`:

1. Add fields on `OfferInfoDto` after `expiryDate`:

```ts
  @IsISO8601()
  @IsOptional()
  expiryDate?: string;

  @IsBoolean()
  @IsOptional()
  startNow?: boolean;

  @IsISO8601()
  @IsOptional()
  startDate?: string;
```

(`IsBoolean` is already imported.)

2. Replace `toExpiryDate` / delete `formatSallaDate` and `formatSallaStartDate`:

```ts
import { parseRiyadhEndOfDay } from '../../../common/time/riyadh-date';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function toExpiryDate(value?: string): Date | null {
  if (!value) return null;
  if (DATE_ONLY.test(value)) return parseRiyadhEndOfDay(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
```

Services still importing `formatSallaDate` / `formatSallaStartDate` will fail to compile until Task 6. That is expected; do not leave stub re-exports.

- [ ] **Step 4: Run Salla helper tests**

Run: `cd /workspace/Back-End && pnpm test -- src/modules/offers/salla-offer-dates.spec.ts src/common/time/riyadh-date.spec.ts src/modules/offers/resolve-start-date.spec.ts`

Expected: those three specs PASS. `nest build` may fail until Task 6 removes old imports — do not run a full build yet.

- [ ] **Step 5: Commit**

```bash
git add Back-End/src/modules/offers/salla-offer-dates.ts Back-End/src/modules/offers/salla-offer-dates.spec.ts Back-End/src/modules/offers/dto/common-offer.dto.ts
git commit -m "$(cat <<'EOF'
feat(offers): unify Salla date formatting and accept startNow

Move Riyadh wall-time formatting out of the DTO and add startNow/startDate fields on OfferInfoDto.
EOF
)"
```

If git hooks fail because services still import deleted functions, include a temporary re-export in the DTO until Task 6, then delete it in Task 6:

```ts
export { formatRiyadhDateTime as formatSallaDate } from '../../../common/time/riyadh-date';
export function formatSallaStartDate(): string {
  return formatRiyadhDateTime(immediateStart(new Date()));
}
```

Prefer not to. If the hook is typecheck-on-commit, do Task 6 in the same commit instead of leaving a broken tree. If that happens, merge Task 3 Steps 3–5 with Task 6 into one commit titled `feat(offers): unify Salla date formatting`.

---

### Task 4: `start_date` column

**Files:**
- Modify: `Back-End/src/database/entities/offers.ts`
- Create: `Back-End/drizzle/0003_offer_start_date.sql`
- Modify: `Back-End/drizzle/meta/_journal.json`

**Interfaces:**
- Consumes: none
- Produces: `offers.startDate: Date | null` on `Offer` / `NewOffer` via `InferSelectModel`

- [ ] **Step 1: Add the column on the entity**

In `Back-End/src/database/entities/offers.ts`, next to `expiryDate`:

```ts
  startDate: timestamp('start_date', { withTimezone: true }),
  expiryDate: timestamp('expiry_date', { withTimezone: true }),
```

- [ ] **Step 2: Add the SQL migration**

Create `Back-End/drizzle/0003_offer_start_date.sql`:

```sql
ALTER TABLE "offers" ADD COLUMN "start_date" timestamp with time zone;
```

Update `Back-End/drizzle/meta/_journal.json` `entries` array, append:

```json
    {
      "idx": 3,
      "version": "7",
      "when": 1790670000000,
      "tag": "0003_offer_start_date",
      "breakpoints": true
    }
```

Do not invent a `0003_snapshot.json` unless `pnpm db:generate` produces one. Hand-written SQL + journal is enough for `drizzle-kit migrate`. If `DATABASE_URL` is set, you may run `cd Back-End && pnpm db:generate` instead of hand-writing; keep the generated tag/filename and use it everywhere this plan says `0003_offer_start_date`.

Do not run `db:migrate` against production in this task. Local migrate is fine if a local DB exists.

Do not edit `Back-End/drizzle/schema.ts` (introspected copy). App schema is `src/database/entities/offers.ts` re-exported by `src/database/schema.ts`.

- [ ] **Step 3: Typecheck the entity change**

Run: `cd /workspace/Back-End && pnpm exec tsc --noEmit --pretty false`

Expected: errors only from leftover `formatSallaDate` imports in offer services (cleared in Task 6), not from `startDate` itself. If tsc is too noisy, skip and rely on Task 6 build.

- [ ] **Step 4: Commit**

```bash
git add Back-End/src/database/entities/offers.ts Back-End/drizzle/0003_offer_start_date.sql Back-End/drizzle/meta/_journal.json
git commit -m "$(cat <<'EOF'
feat(offers): add start_date timestamptz column

Persist the Salla/start instant so updates no longer rewrite start_date to now.
EOF
)"
```

---

### Task 5: Persist schedule on all five offer services

**Files:**
- Modify: `Back-End/src/modules/offers/quantity/quantity-offer.service.ts`
- Modify: `Back-End/src/modules/offers/addon/addon-offer.service.ts`
- Modify: `Back-End/src/modules/offers/bundle/bundle-offer.service.ts`
- Modify: `Back-End/src/modules/offers/upgrade/upgrade-offer.service.ts`
- Modify: `Back-End/src/modules/offers/recommendation/recommendation-offer.service.ts`

**Interfaces:**
- Consumes: `offerScheduleFields(info, existingStart?)` from Task 2
- Produces: every create/update writes `startDate` + `expiryDate`. On invalid schedule, `{ success: false, reason: 'validation_error', error }` (controllers already map this to 400).

No new Jest file. Controllers already throw `BadRequestException` for any failed create/update that is not `not_found`.

- [ ] **Step 1: Quantity create/update**

Import:

```ts
import { toExpiryDate } from '../dto/common-offer.dto';
```

Replace that import with:

```ts
import { offerScheduleFields } from '../resolve-start-date';
```

At the start of `create`, before `this.db.transaction`:

```ts
    const schedule = offerScheduleFields(dto.info);
    if (!schedule.ok) {
      return { success: false, reason: 'validation_error', error: schedule.error };
    }
```

In the insert `.values({...})` replace `expiryDate: toExpiryDate(dto.info.expiryDate)` with:

```ts
          startDate: schedule.startDate,
          expiryDate: schedule.expiryDate,
```

At the start of `update`, after `if (!existing.success) return existing;`:

```ts
    const schedule = offerScheduleFields(dto.info, existing.data.startDate);
    if (!schedule.ok) {
      return { success: false, reason: 'validation_error', error: schedule.error };
    }
```

In the update `.set({...})` replace `expiryDate: toExpiryDate(...)` with:

```ts
          startDate: schedule.startDate,
          expiryDate: schedule.expiryDate,
```

- [ ] **Step 2: Addon create/update**

Same pattern as Step 1 in `addon-offer.service.ts`:

- swap `toExpiryDate` import for `offerScheduleFields`
- `create`: resolve schedule, set `startDate` / `expiryDate` on insert
- `update`: `offerScheduleFields(dto.info, existing.data.startDate)`, write both columns

- [ ] **Step 3: Bundle create/update**

Same pattern in `bundle-offer.service.ts` (create insert ~line 84, update set ~line 169).

- [ ] **Step 4: Upgrade create/update**

Same pattern in `upgrade-offer.service.ts`. Upgrade does not call Salla; still persist both columns (create insert ~line 69, update set ~line 127).

- [ ] **Step 5: Recommendation create/update**

Same pattern in `recommendation-offer.service.ts` (create ~line 77, update ~line 129). No Salla date sync.

- [ ] **Step 6: Commit**

```bash
git add \
  Back-End/src/modules/offers/quantity/quantity-offer.service.ts \
  Back-End/src/modules/offers/addon/addon-offer.service.ts \
  Back-End/src/modules/offers/bundle/bundle-offer.service.ts \
  Back-End/src/modules/offers/upgrade/upgrade-offer.service.ts \
  Back-End/src/modules/offers/recommendation/recommendation-offer.service.ts
git commit -m "$(cat <<'EOF'
feat(offers): persist Riyadh start and expiry on create and update

All five offer kinds resolve schedule through offerScheduleFields so frozen starts survive edits.
EOF
)"
```

If quantity/addon/bundle still import `formatSallaDate` and the commit hook typechecks, leave those imports until Task 6 and combine commits as noted in Task 3.

---

### Task 6: Unify Salla `start_date` / `expiry_date` in syncToSalla

**Files:**
- Modify: `Back-End/src/modules/offers/quantity/quantity-offer.service.ts`
- Modify: `Back-End/src/modules/offers/addon/addon-offer.service.ts`
- Modify: `Back-End/src/modules/offers/bundle/bundle-offer.service.ts`

**Interfaces:**
- Consumes: `sallaOfferDates` from Task 3; `offer.startDate` / `offer.expiryDate` from Task 4–5
- Produces: every Salla POST/PUT sends stored instants. No `setHours`. No `formatSallaStartDate()`.

- [ ] **Step 1: Quantity `syncToSalla`**

Replace:

```ts
import { toExpiryDate, formatSallaDate, formatSallaStartDate } from '../dto/common-offer.dto';
```

If Task 5 already swapped `toExpiryDate` for `offerScheduleFields`, add:

```ts
import { sallaOfferDates } from '../salla-offer-dates';
```

Delete:

```ts
      const startDateStr = formatSallaStartDate();
      const expiryDateStr = offer.expiryDate
        ? formatSallaDate(new Date(offer.expiryDate))
        : undefined;
```

Insert:

```ts
      const { start_date: startDateStr, expiry_date: expiryDateStr } =
        sallaOfferDates(offer);
```

Keep `start_date: startDateStr` on the payload and `if (expiryDateStr) payload.expiry_date = expiryDateStr`.

- [ ] **Step 2: Addon `syncToSalla`**

Remove the midnight workaround:

```ts
      const startDateStr = formatSallaStartDate();
      let expiryDateStr: string | undefined = undefined;
      if (offer.expiryDate) {
        const exp = new Date(offer.expiryDate);
        if (!isNaN(exp.getTime())) {
          if (
            exp.getHours() === 0 &&
            exp.getMinutes() === 0 &&
            exp.getSeconds() === 0
          ) {
            exp.setHours(23, 59, 59);
          }
          expiryDateStr = formatSallaDate(exp);
        }
      }
```

Replace with:

```ts
      const { start_date: startDateStr, expiry_date: expiryDateStr } =
        sallaOfferDates(offer);
```

Drop `formatSallaDate` / `formatSallaStartDate` from the import; add `sallaOfferDates`.

- [ ] **Step 3: Bundle `syncToSalla`**

Identical replacement of the `setHours(23, 59, 59)` block (~lines 333–347) with `sallaOfferDates(offer)`.

- [ ] **Step 4: Confirm no leftover formatters**

Run: `cd /workspace && rg "formatSallaDate|formatSallaStartDate|setHours\\(23" Back-End --glob '*.ts'`

Expected: no matches (except git history). `toExpiryDate` may still exist in `common-offer.dto.ts`.

Run: `cd /workspace/Back-End && pnpm test -- src/common/time/riyadh-date.spec.ts src/modules/offers/resolve-start-date.spec.ts src/modules/offers/salla-offer-dates.spec.ts && pnpm exec tsc --noEmit --pretty false`

Expected: tests PASS, tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add \
  Back-End/src/modules/offers/quantity/quantity-offer.service.ts \
  Back-End/src/modules/offers/addon/addon-offer.service.ts \
  Back-End/src/modules/offers/bundle/bundle-offer.service.ts
git commit -m "$(cat <<'EOF'
fix(offers): send stored Riyadh instants to Salla on create and update

Stop resetting start_date to now+90s and drop per-type midnight setHours hacks.
EOF
)"
```

---

### Task 7: Frontend calendar-day helpers, form, and list

**Files:**
- Create: `Front-End/lib/utils/riyadh-date.ts`
- Create: `Front-End/lib/utils/riyadh-date.test.ts`
- Modify: `Front-End/lib/schemas/common-offer.ts`
- Modify: `Front-End/lib/utils/offer-transformers.ts`
- Modify: `Front-End/lib/utils/offer-transformers.test.ts`
- Modify: `Front-End/lib/schemas/quantity-offer.ts` (full schema `startDate` if present — add optional `startDate` next to `expiryDate` on each `*OfferFull` schema)
- Modify: `Front-End/lib/schemas/addon-offer.ts`
- Modify: `Front-End/lib/schemas/bundle-offer.ts`
- Modify: `Front-End/lib/schemas/upgrade-offer.ts`
- Modify: `Front-End/lib/schemas/recommendation-offer.ts`
- Modify: `Front-End/components/offers/builder/steps/general-info-step.tsx`
- Modify: `Front-End/components/offers/offer-master-list.tsx`
- Modify: `Front-End/messages/en.json`
- Modify: `Front-End/messages/ar.json`

**Interfaces:**
- Consumes: backend JSON ISO instants for `startDate` / `expiryDate`
- Produces: drafts send `info.startNow`, `info.startDate` (`YYYY-MM-DD` or omitted), `info.expiryDate` (`YYYY-MM-DD` or omitted)

- [ ] **Step 1: Write failing FE riyadh-date tests**

Create `Front-End/lib/utils/riyadh-date.test.ts`:

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  riyadhToday,
  riyadhTomorrow,
  toRiyadhCalendarDate,
} from './riyadh-date';

describe('toRiyadhCalendarDate', () => {
  it('keeps Riyadh EOD on the same calendar day', () => {
    assert.equal(
      toRiyadhCalendarDate(new Date('2026-10-15T20:59:59.999Z')),
      '2026-10-15',
    );
  });

  it('does not UTC-slice Riyadh midnight to the previous day', () => {
    assert.equal(
      toRiyadhCalendarDate(new Date('2026-10-15T21:00:00.000Z')),
      '2026-10-16',
    );
  });
});

describe('riyadhToday / riyadhTomorrow', () => {
  it('uses Riyadh calendar, not UTC', () => {
    const now = new Date('2026-10-15T21:00:00.000Z');
    assert.equal(riyadhToday(now), '2026-10-16');
    assert.equal(riyadhTomorrow(now), '2026-10-17');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /workspace/Front-End && node --experimental-strip-types --test lib/utils/riyadh-date.test.ts`

Expected: FAIL (cannot find module). If Node lacks `--experimental-strip-types`, run `cd /workspace/Front-End && npx --yes tsx --test lib/utils/riyadh-date.test.ts`.

- [ ] **Step 3: Implement FE helper**

Create `Front-End/lib/utils/riyadh-date.ts`:

```ts
const APP_TIMEZONE = 'Asia/Riyadh';

export function toRiyadhCalendarDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function riyadhToday(now: Date = new Date()): string {
  return toRiyadhCalendarDate(now);
}

export function riyadhTomorrow(now: Date = new Date()): string {
  const today = riyadhToday(now);
  const start = new Date(`${today}T00:00:00.000+03:00`);
  return toRiyadhCalendarDate(new Date(start.getTime() + 24 * 60 * 60 * 1000));
}

export function isStartFrozen(
  start: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!start) return false;
  const d = start instanceof Date ? start : new Date(start);
  return !Number.isNaN(d.getTime()) && d.getTime() <= now.getTime();
}
```

- [ ] **Step 4: Run FE riyadh-date tests**

Run: `cd /workspace/Front-End && node --experimental-strip-types --test lib/utils/riyadh-date.test.ts`

Expected: PASS.

- [ ] **Step 5: Schema + transformers**

In `Front-End/lib/schemas/common-offer.ts` `offerInfoSchema`:

```ts
  expiryDate: z.string().optional(),
  startNow: z.boolean().optional().default(true),
  startDate: z.string().optional(),
```

On `dashboardOfferSchema` leave expiry only (list does not need start).

On each full offer schema (`quantity-offer.ts`, `addon-offer.ts`, `bundle-offer.ts`, `upgrade-offer.ts`, `recommendation-offer.ts`) add next to `expiryDate`:

```ts
  startDate: z.string().nullable().optional(),
```

In `Front-End/lib/utils/offer-transformers.ts` replace `toDateInput` and add start mapping:

```ts
import { isStartFrozen, toRiyadhCalendarDate } from '@/lib/utils/riyadh-date';

function toDateInput(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return toRiyadhCalendarDate(d);
}

function toStartInfo(startDate?: string | null): {
  startNow: boolean;
  startDate?: string;
} {
  if (!startDate) return { startNow: true };
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return { startNow: true };
  if (isStartFrozen(d)) {
    return { startNow: false, startDate: toRiyadhCalendarDate(d) };
  }
  const cal = toRiyadhCalendarDate(d);
  const midnight = new Date(`${cal}T00:00:00.000+03:00`);
  if (d.getTime() === midnight.getTime()) {
    return { startNow: false, startDate: cal };
  }
  return { startNow: true };
}
```

Every `info: { ..., expiryDate: toDateInput(...) }` block becomes:

```ts
      ...toStartInfo(offer.startDate),
      expiryDate: toDateInput(offer.expiryDate),
```

(`fullOfferToQuantityDraft`, addon, bundle, upgrade, recommendation.)

`defaultInfo()`:

```ts
function defaultInfo() {
  return {
    internalName: '',
    title: { ar: '', en: '' },
    subtitle: { ar: '', en: '' },
    startNow: true,
    startDate: undefined,
    expiryDate: undefined,
  };
}
```

`defaultQuantityDraft.info` must include `startNow: true` (it inlines info instead of `defaultInfo()`).

Extend `Front-End/lib/utils/offer-transformers.test.ts` with:

```ts
  it('maps a frozen startDate onto a locked calendar day', () => {
    const offer = {
      id: 1,
      merchantId: 9,
      kind: 'upgrade_offer',
      internalName: 'u',
      title: { ar: 'أ', en: 'A' },
      subtitle: null,
      targetType: 'selected_products',
      startDate: '2026-01-01T00:00:00.000Z',
      expiryDate: '2026-10-15T20:59:59.999Z',
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
    assert.equal(draft.info.startNow, false);
    assert.equal(draft.info.startDate, '2026-01-01');
    assert.equal(draft.info.expiryDate, '2026-10-15');
  });
```

Run: `cd /workspace/Front-End && node --experimental-strip-types --test lib/utils/offer-transformers.test.ts lib/utils/riyadh-date.test.ts`

Expected: PASS.

- [ ] **Step 6: General info step + i18n + master list**

`Front-End/messages/en.json` under `Offers.info`:

```json
      "expiry": "End date",
      "noExpiry": "No end date",
      "startNow": "Start immediately",
      "startDate": "Start date",
      "startFrozen": "Start date cannot be changed after the offer has started"
```

`Front-End/messages/ar.json` under `Offers.info`:

```json
      "expiry": "تاريخ الانتهاء",
      "noExpiry": "بدون تاريخ انتهاء",
      "startNow": "ابدأ فوراً",
      "startDate": "تاريخ البداية",
      "startFrozen": "لا يمكن تغيير تاريخ البداية بعد بدء العرض"
```

Replace `general-info-step.tsx` date helpers and the expiry block. Full file:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { OfferInfo } from "@/lib/schemas/common-offer";
import {
  isStartFrozen,
  riyadhToday,
  riyadhTomorrow,
  toRiyadhCalendarDate,
} from "@/lib/utils/riyadh-date";

interface InfoDraftShape {
  info: OfferInfo;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : toRiyadhCalendarDate(d);
}

export function GeneralInfoStep() {
  const t = useTranslations("Offers");
  const tCommon = useTranslations("Common");
  const form = useFormContext<InfoDraftShape>();
  const noExpiry = form.watch("info.expiryDate") === undefined;
  const startNow = form.watch("info.startNow") !== false;
  const storedStart = form.watch("info.startDate");
  const frozen = isStartFrozen(
    storedStart && !/^\d{4}-\d{2}-\d{2}$/.test(storedStart)
      ? storedStart
      : undefined,
  );
  const startMin = riyadhTomorrow();
  const expiryMin = startNow
    ? riyadhToday()
    : (toDateInputValue(storedStart) || startMin);

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="info.internalName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("info.internalName")}</FormLabel>
            <FormControl>
              <Input {...field} placeholder={t("info.internalNamePlaceholder")} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="info.title.ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("info.title")} — {tCommon("ar")}</FormLabel>
              <FormControl>
                <Input {...field} dir="rtl" placeholder={t("info.titlePlaceholderAr")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="info.title.en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("info.title")} — {tCommon("en")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("info.titlePlaceholderEn")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="info.subtitle.ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("info.subtitle")} — {tCommon("ar")}</FormLabel>
              <FormControl>
                <Input {...field} dir="rtl" placeholder={t("info.subtitlePlaceholderAr")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="info.subtitle.en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("info.subtitle")} — {tCommon("en")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("info.subtitlePlaceholderEn")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t("info.startDate")}</Label>
          <Input
            id="startDate"
            type="date"
            disabled={startNow || frozen}
            min={startMin}
            value={toDateInputValue(form.watch("info.startDate"))}
            onChange={(e) =>
              form.setValue(
                "info.startDate",
                e.target.value ? e.target.value : undefined,
              )
            }
            className="w-52"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm cursor-pointer">
          <Checkbox
            checked={startNow}
            disabled={frozen}
            onCheckedChange={(checked) => {
              form.setValue("info.startNow", Boolean(checked));
              form.setValue(
                "info.startDate",
                checked ? undefined : riyadhTomorrow(),
              );
            }}
          />
          {t("info.startNow")}
        </label>
      </div>
      {frozen ? (
        <p className="text-xs text-muted-foreground">{t("info.startFrozen")}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry">{t("info.expiry")}</Label>
          <Input
            id="expiry"
            type="date"
            disabled={noExpiry}
            min={expiryMin}
            value={toDateInputValue(form.watch("info.expiryDate"))}
            onChange={(e) =>
              form.setValue(
                "info.expiryDate",
                e.target.value ? e.target.value : undefined,
              )
            }
            className="w-52"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm cursor-pointer">
          <Checkbox
            checked={noExpiry}
            onCheckedChange={(checked) =>
              form.setValue(
                "info.expiryDate",
                checked ? undefined : riyadhToday(),
              )
            }
          />
          {t("info.noExpiry")}
        </label>
      </div>
    </div>
  );
}
```

Frozen detection above is weak if `startDate` on the draft is already `YYYY-MM-DD`. Pass freeze from the transformer instead: add optional `info.startFrozen?: boolean` **or** compare the original ISO. Simpler: have `toStartInfo` set `startNow: false` and a calendar day when frozen, and also set a sibling not in the schema.

Cleaner freeze signal: extend `offerInfoSchema` with `startFrozen: z.boolean().optional()` (not sent to API — strip on submit if needed). If the submit payload includes `startFrozen`, backend ignores unknown fields (class-validator whitelist may strip it). Nest default is not to strip unknown unless `whitelist: true`. Do not add `startFrozen` to `OfferInfoDto`.

Add to `offerInfoSchema`:

```ts
  startFrozen: z.boolean().optional(),
```

`toStartInfo` when frozen:

```ts
    return { startNow: false, startDate: toRiyadhCalendarDate(d), startFrozen: true };
```

In the step: `const frozen = form.watch("info.startFrozen") === true;`

In `offer-master-list.tsx` replace:

```tsx
                    {offer.expiryDate
                      ? new Date(offer.expiryDate).toLocaleDateString()
                      : t("masterList.never")}
```

with:

```tsx
                    {offer.expiryDate
                      ? toRiyadhCalendarDate(new Date(offer.expiryDate))
                      : t("masterList.never")}
```

Import `toRiyadhCalendarDate` from `@/lib/utils/riyadh-date`.

- [ ] **Step 7: Re-run FE tests**

Run: `cd /workspace/Front-End && node --experimental-strip-types --test lib/utils/riyadh-date.test.ts lib/utils/offer-transformers.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add \
  Front-End/lib/utils/riyadh-date.ts \
  Front-End/lib/utils/riyadh-date.test.ts \
  Front-End/lib/schemas/common-offer.ts \
  Front-End/lib/schemas/quantity-offer.ts \
  Front-End/lib/schemas/addon-offer.ts \
  Front-End/lib/schemas/bundle-offer.ts \
  Front-End/lib/schemas/upgrade-offer.ts \
  Front-End/lib/schemas/recommendation-offer.ts \
  Front-End/lib/utils/offer-transformers.ts \
  Front-End/lib/utils/offer-transformers.test.ts \
  Front-End/components/offers/builder/steps/general-info-step.tsx \
  Front-End/components/offers/offer-master-list.tsx \
  Front-End/messages/en.json \
  Front-End/messages/ar.json
git commit -m "$(cat <<'EOF'
feat(offers): Riyadh start/expiry pickers and calendar-date display

Stop slicing UTC ISO strings for date inputs and freeze start after it has begun.
EOF
)"
```

---

### Task 8: Backfill existing rows

**Files:**
- Create: `Back-End/scripts/backfill-offer-dates.ts`
- Modify: `Back-End/package.json`

**Interfaces:**
- Consumes: `toRiyadhCalendarDate`, `parseRiyadhEndOfDay` from Task 1; merchant `accessToken`; Salla `GET /admin/v2/specialoffers/{id}`
- Produces: every offer has canonical Riyadh-EOD `expiry_date` (if it had one) and a non-null `start_date`

- [ ] **Step 1: Add the npm script**

In `Back-End/package.json` `scripts`:

```json
    "db:backfill-offer-dates": "ts-node --transpile-only scripts/backfill-offer-dates.ts"
```

- [ ] **Step 2: Write the script**

Create `Back-End/scripts/backfill-offer-dates.ts` following `backfill-merchant-profiles.ts` (dotenv, Pool, fail-soft):

```ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, isNull } from 'drizzle-orm';
import { offers } from '../src/database/entities/offers';
import { merchants } from '../src/database/entities/merchants';
import {
  parseRiyadhEndOfDay,
  toRiyadhCalendarDate,
} from '../src/common/time/riyadh-date';

const SALLA_SPECIAL_OFFERS_URL = 'https://api.salla.dev/admin/v2/specialoffers';

function parseSallaStart(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const trimmed = raw.trim();
  const asIso = trimmed.includes('T')
    ? trimmed
    : trimmed.replace(' ', 'T') + '+03:00';
  const parsed = new Date(asIso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function bootstrap() {
  console.log('Starting Backfill Offer Dates script...');

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is missing from environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  let failed = false;

  try {
    const rows = await db
      .select({
        id: offers.id,
        merchantId: offers.merchantId,
        expiryDate: offers.expiryDate,
        startDate: offers.startDate,
        sallaOfferId: offers.sallaOfferId,
        createdAt: offers.createdAt,
      })
      .from(offers);

    let expiryUpdated = 0;
    let startUpdated = 0;
    let startSkipped = 0;

    for (const row of rows) {
      if (row.expiryDate) {
        const cal = toRiyadhCalendarDate(new Date(row.expiryDate));
        const next = parseRiyadhEndOfDay(cal);
        if (next && next.getTime() !== new Date(row.expiryDate).getTime()) {
          await db
            .update(offers)
            .set({ expiryDate: next })
            .where(eq(offers.id, row.id));
          expiryUpdated++;
        }
      }

      if (row.startDate) {
        startSkipped++;
        continue;
      }

      let start: Date | null = null;
      if (row.sallaOfferId) {
        const [merchant] = await db
          .select({ accessToken: merchants.accessToken })
          .from(merchants)
          .where(eq(merchants.merchantId, row.merchantId));
        if (merchant?.accessToken) {
          try {
            const response = await fetch(
              `${SALLA_SPECIAL_OFFERS_URL}/${row.sallaOfferId}`,
              { headers: { Authorization: `Bearer ${merchant.accessToken}` } },
            );
            if (response.ok) {
              const json = (await response.json()) as {
                data?: { start_date?: string; startDate?: string };
                start_date?: string;
                startDate?: string;
              };
              start = parseSallaStart(
                json.data?.start_date ??
                  json.data?.startDate ??
                  json.start_date ??
                  json.startDate,
              );
            } else {
              console.warn(
                `Salla GET offer ${row.sallaOfferId} failed (${response.status}); using createdAt`,
              );
            }
          } catch (err) {
            console.warn(
              `Salla GET offer ${row.sallaOfferId} errored; using createdAt`,
              err,
            );
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      const fallback = new Date(row.createdAt);
      await db
        .update(offers)
        .set({ startDate: start ?? fallback })
        .where(eq(offers.id, row.id));
      startUpdated++;
    }

    console.log(
      `Offer dates backfill complete! expiryUpdated=${expiryUpdated} startUpdated=${startUpdated} startAlreadySet=${startSkipped}`,
    );
  } catch (error) {
    console.error('Backfill failed:', error);
    failed = true;
  } finally {
    await pool.end();
    process.exit(failed ? 1 : 0);
  }
}

void bootstrap();
```

Remove the unused `isNull` import if you copied it — the script above does not use `isNull`. Do not import it.

Idempotent: expiry skipped when already EOD; start skipped when non-null.

- [ ] **Step 3: Syntax-check the script**

Run: `cd /workspace/Back-End && pnpm exec tsc --noEmit --pretty false && pnpm test -- src/common/time/riyadh-date.spec.ts src/modules/offers/resolve-start-date.spec.ts src/modules/offers/salla-offer-dates.spec.ts`

Expected: tsc 0, tests PASS. Do not run the backfill against a real DB in this task unless the user asks.

- [ ] **Step 4: Commit**

```bash
git add Back-End/scripts/backfill-offer-dates.ts Back-End/package.json
git commit -m "$(cat <<'EOF'
chore(offers): backfill Riyadh EOD expiry and Salla start dates

Rewrite stored UTC-midnight expiry to end-of-Riyadh-day and copy start_date from Salla, falling back to createdAt.
EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| `parseRiyadhEndOfDay` / start-of-day / format / today / freeze helpers | 1 |
| Immediate vs calendar vs frozen start; start < expiry; ISO expiry escape hatch | 2 |
| Unified Salla formatter; DTO `startNow` / `startDate`; `toExpiryDate` date-only → EOD | 3 |
| `start_date` timestamptz, migration not mixed with data | 4 |
| All five kinds persist schedule; upgrade/recommendation no Salla dates | 5 |
| Quantity/addon/bundle drop `setHours` and `now+90s` on PUT | 6 |
| FE never UTC-slices; start checkbox + min=tomorrow; freeze UI; list in Riyadh | 7 |
| Backfill expiry via stored calendar date; Salla GET start; fallback `createdAt`; sequential 200ms | 8 |
| Cron unchanged | no code (non-goal) |
| No luxon | all tasks |

No TBD. Function names are consistent (`offerScheduleFields`, `sallaOfferDates`, `toRiyadhCalendarDate`, `immediateStart`, `isStartFrozen`).
)
