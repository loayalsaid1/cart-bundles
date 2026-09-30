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
