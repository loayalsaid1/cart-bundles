import {
  immediateStart,
  isStartFrozen,
  parseRiyadhEndOfDay,
  parseRiyadhStartOfDay,
  riyadhToday,
} from '../../common/time/riyadh-date';

export type OfferScheduleInfo = {
  startNow?: boolean;
  startDate?: string;
  expiryDate?: string;
};

export type OfferScheduleResult =
  | { ok: true; startDate: Date; expiryDate: Date | null }
  | { ok: false; error: string };

export function offerScheduleFields(
  info: OfferScheduleInfo,
  existingStart?: Date | null,
  now: Date = new Date(),
): OfferScheduleResult {
  // --- Expiry ---
  const expiryDate = info.expiryDate ? parseRiyadhEndOfDay(info.expiryDate) : null;
  if (info.expiryDate && !expiryDate) {
    return { ok: false, error: 'Invalid expiry date' };
  }
  if (info.expiryDate && info.expiryDate <= riyadhToday(now)) {
    return { ok: false, error: 'Expiry date must be tomorrow or later' };
  }

  // --- Start ---
  let startDate: Date;

  if (isStartFrozen(existingStart, now)) {
    startDate = existingStart as Date;
  } else if (info.startNow !== false) {
    startDate = immediateStart(now);
  } else {
    if (!info.startDate) {
      return { ok: false, error: 'Start date is required' };
    }
    const parsed = parseRiyadhStartOfDay(info.startDate);
    if (!parsed) {
      return { ok: false, error: 'Invalid start date' };
    }
    if (info.startDate <= riyadhToday(now)) {
      return { ok: false, error: 'Start date must be tomorrow or later' };
    }
    startDate = parsed;
  }

  if (expiryDate && startDate.getTime() >= expiryDate.getTime()) {
    return { ok: false, error: 'Start date must be before expiry date' };
  }

  return { ok: true, startDate, expiryDate };
}
