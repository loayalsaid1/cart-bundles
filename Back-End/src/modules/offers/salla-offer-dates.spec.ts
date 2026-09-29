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
