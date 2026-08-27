import { http } from '@/lib/http';
import {
  quantityOfferDraftSchema,
  quantityOfferFullSchema,
  type QuantityOfferDraft,
  type QuantityOfferFull,
} from '@/lib/schemas/quantity-offer';

export async function listQuantityOffers(): Promise<QuantityOfferFull[]> {
  const data = await http<unknown>('/offers/quantity');
  return quantityOfferFullSchema.array().parse(data);
}

export async function getQuantityOffer(id: number): Promise<QuantityOfferFull> {
  const data = await http<unknown>(`/offers/quantity/${id}`);
  return quantityOfferFullSchema.parse(data);
}

export async function createQuantityOffer(draft: QuantityOfferDraft): Promise<QuantityOfferFull> {
  const payload = quantityOfferDraftSchema.parse(draft);
  const data = await http<unknown>('/offers/quantity', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return quantityOfferFullSchema.parse(data);
}

export async function updateQuantityOffer(
  id: number,
  draft: QuantityOfferDraft,
): Promise<QuantityOfferFull> {
  const payload = quantityOfferDraftSchema.parse(draft);
  const data = await http<unknown>(`/offers/quantity/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return quantityOfferFullSchema.parse(data);
}

export async function deleteQuantityOffer(id: number): Promise<void> {
  await http(`/offers/quantity/${id}`, { method: 'DELETE' });
}
