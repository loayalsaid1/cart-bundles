import { z } from 'zod';
import { dashboardOfferSchema, type DashboardOffer, type OfferKind, type OfferStatus } from '@/lib/schemas/common-offer';
import { http } from '@/lib/http';

export type DashboardFilters = {
  search?: string;
  type?: OfferKind | 'all';
  status?: OfferStatus | 'all';
  productId?: number;
};

export async function getDashboardOffers(filters: DashboardFilters = {}): Promise<DashboardOffer[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.productId) params.set('productId', String(filters.productId));
  const qs = params.toString();
  const data = await http<unknown>(`/offers/dashboard${qs ? `?${qs}` : ''}`);
  return z.array(dashboardOfferSchema).parse(data);
}

export async function toggleOfferStatus(offerId: number, status: OfferStatus) {
  return http<{ id: number; status: OfferStatus }>(`/offers/${offerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
