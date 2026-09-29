import type { OfferInfo } from '@/lib/schemas/common-offer';

export function toOfferPayload<T extends { info: OfferInfo }>(
  payload: T,
): Omit<T, 'info'> & { info: OfferInfo } {
  const info = { ...payload.info };
  delete info.startFrozen;
  return { ...payload, info };
}
