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
