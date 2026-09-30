import { http } from '@/lib/http';
import { toOfferPayload } from '@/lib/utils/offer-payload';
import {
  addonOfferDraftSchema,
  addonOfferFullSchema,
  type AddonOfferDraft,
  type AddonOfferFull,
} from '@/lib/schemas/addon-offer';

export async function listAddonOffers(): Promise<AddonOfferFull[]> {
  const data = await http<unknown>('/offers/addon');
  return addonOfferFullSchema.array().parse(data);
}

export async function getAddonOffer(id: number): Promise<AddonOfferFull> {
  const data = await http<unknown>(`/offers/addon/${id}`);
  return addonOfferFullSchema.parse(data);
}

export async function createAddonOffer(draft: AddonOfferDraft): Promise<AddonOfferFull> {
  const payload = toOfferPayload(addonOfferDraftSchema.parse(draft));
  const data = await http<unknown>('/offers/addon', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return addonOfferFullSchema.parse(data);
}

export async function updateAddonOffer(
  id: number,
  draft: AddonOfferDraft,
): Promise<AddonOfferFull> {
  const payload = toOfferPayload(addonOfferDraftSchema.parse(draft));
  const data = await http<unknown>(`/offers/addon/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return addonOfferFullSchema.parse(data);
}

export async function deleteAddonOffer(id: number): Promise<void> {
  await http(`/offers/addon/${id}`, { method: 'DELETE' });
}
