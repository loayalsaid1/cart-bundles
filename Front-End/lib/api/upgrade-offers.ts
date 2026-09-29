import { http } from '@/lib/http';
import { toOfferPayload } from '@/lib/utils/offer-payload';
import {
  upgradeOfferDraftSchema,
  upgradeOfferFullSchema,
  type UpgradeOfferDraft,
  type UpgradeOfferFull,
} from '@/lib/schemas/upgrade-offer';

export async function listUpgradeOffers(): Promise<UpgradeOfferFull[]> {
  const data = await http<unknown>('/offers/upgrade');
  return upgradeOfferFullSchema.array().parse(data);
}

export async function getUpgradeOffer(id: number): Promise<UpgradeOfferFull> {
  const data = await http<unknown>(`/offers/upgrade/${id}`);
  return upgradeOfferFullSchema.parse(data);
}

export async function createUpgradeOffer(draft: UpgradeOfferDraft): Promise<UpgradeOfferFull> {
  const payload = toOfferPayload(upgradeOfferDraftSchema.parse(draft));
  const data = await http<unknown>('/offers/upgrade', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return upgradeOfferFullSchema.parse(data);
}

export async function updateUpgradeOffer(
  id: number,
  draft: UpgradeOfferDraft,
): Promise<UpgradeOfferFull> {
  const payload = toOfferPayload(upgradeOfferDraftSchema.parse(draft));
  const data = await http<unknown>(`/offers/upgrade/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return upgradeOfferFullSchema.parse(data);
}

export async function deleteUpgradeOffer(id: number): Promise<void> {
  await http(`/offers/upgrade/${id}`, { method: 'DELETE' });
}
