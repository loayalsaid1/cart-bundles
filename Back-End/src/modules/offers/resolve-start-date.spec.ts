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
