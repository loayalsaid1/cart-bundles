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
