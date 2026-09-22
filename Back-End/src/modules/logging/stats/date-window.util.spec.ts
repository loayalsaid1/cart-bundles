import { getDateWindow } from './date-window.util';

describe('getDateWindow', () => {
  it('returns 30 UTC calendar days inclusive of today', () => {
    const today = new Date('2026-09-18T15:04:05.000Z');
    const { start, end, days } = getDateWindow(30, today);

    expect(days).toHaveLength(30);
    expect(start).toBe('2026-08-20');
    expect(end).toBe('2026-09-18');
    expect(days[0]).toBe(start);
    expect(days[days.length - 1]).toBe(end);
  });

  it('does not shift the UTC date when local time is past midnight', () => {
    const { end } = getDateWindow(1, new Date('2026-09-18T23:30:00.000Z'));
    expect(end).toBe('2026-09-18');
  });
});
