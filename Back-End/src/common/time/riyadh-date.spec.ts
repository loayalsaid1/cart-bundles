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
