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
