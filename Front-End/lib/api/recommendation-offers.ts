import { http } from '@/lib/http';
import {
  recommendationOfferDraftSchema,
  recommendationOfferFullSchema,
  type RecommendationOfferDraft,
  type RecommendationOfferFull,
} from '@/lib/schemas/recommendation-offer';

export async function listRecommendationOffers(): Promise<RecommendationOfferFull[]> {
  const data = await http<unknown>('/offers/recommendation');
  return recommendationOfferFullSchema.array().parse(data);
}

export async function getRecommendationOffer(
  id: number,
): Promise<RecommendationOfferFull> {
  const data = await http<unknown>(`/offers/recommendation/${id}`);
  return recommendationOfferFullSchema.parse(data);
}

export async function createRecommendationOffer(
  draft: RecommendationOfferDraft,
): Promise<RecommendationOfferFull> {
  const payload = recommendationOfferDraftSchema.parse(draft);
  const data = await http<unknown>('/offers/recommendation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return recommendationOfferFullSchema.parse(data);
}

export async function updateRecommendationOffer(
  id: number,
  draft: RecommendationOfferDraft,
): Promise<RecommendationOfferFull> {
  const payload = recommendationOfferDraftSchema.parse(draft);
  const data = await http<unknown>(`/offers/recommendation/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return recommendationOfferFullSchema.parse(data);
}

export async function deleteRecommendationOffer(id: number): Promise<void> {
  await http(`/offers/recommendation/${id}`, { method: 'DELETE' });
}
