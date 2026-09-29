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
