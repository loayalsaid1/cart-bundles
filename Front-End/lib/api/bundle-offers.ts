import { http } from '@/lib/http';
import { toOfferPayload } from '@/lib/utils/offer-payload';
import {
  bundleOfferDraftSchema,
  bundleOfferFullSchema,
  type BundleOfferDraft,
  type BundleOfferFull,
} from '@/lib/schemas/bundle-offer';

export async function listBundleOffers(): Promise<BundleOfferFull[]> {
  const data = await http<unknown>('/offers/bundle');
  return bundleOfferFullSchema.array().parse(data);
}

export async function getBundleOffer(id: number): Promise<BundleOfferFull> {
  const data = await http<unknown>(`/offers/bundle/${id}`);
  return bundleOfferFullSchema.parse(data);
}

export async function createBundleOffer(draft: BundleOfferDraft): Promise<BundleOfferFull> {
  const payload = toOfferPayload(bundleOfferDraftSchema.parse(draft));
  const data = await http<unknown>('/offers/bundle', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return bundleOfferFullSchema.parse(data);
}

export async function updateBundleOffer(
  id: number,
  draft: BundleOfferDraft,
): Promise<BundleOfferFull> {
  const payload = toOfferPayload(bundleOfferDraftSchema.parse(draft));
  const data = await http<unknown>(`/offers/bundle/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return bundleOfferFullSchema.parse(data);
}

export async function deleteBundleOffer(id: number): Promise<void> {
  await http(`/offers/bundle/${id}`, { method: 'DELETE' });
}
