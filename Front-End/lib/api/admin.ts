import { z } from 'zod';
import { http } from '@/lib/http';
import {
  activityListResponseSchema,
  activityLogSchema,
  type ActivityListResponse,
  type ActivityLog,
} from '@/lib/schemas/activity';
import {
  adminLoginSchema,
  adminMerchantDetailSchema,
  adminMerchantSchema,
  adminOverviewSchema,
  type AdminMerchant,
  type AdminMerchantDetail,
  type AdminOverview,
} from '@/lib/schemas/admin';
import {
  suggestionSchema,
  type Suggestion,
  type SuggestionStatus,
} from '@/lib/schemas/suggestions';

export async function adminLogin(input: {
  email: string;
  password: string;
}): Promise<{ success: boolean }> {
  const data = await http<unknown>('/admin/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return adminLoginSchema.parse(data);
}

export async function adminLogout(): Promise<{ success: boolean }> {
  const data = await http<unknown>('/admin/logout', { method: 'POST' });
  return adminLoginSchema.parse(data);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const data = await http<unknown>('/admin/overview');
  return adminOverviewSchema.parse(data);
}

export async function getAdminActivity(filters: {
  merchantId?: number;
  actorType?: string;
  action?: string;
  severity?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ActivityListResponse> {
  const params = new URLSearchParams();
  if (filters.merchantId) params.set('merchantId', String(filters.merchantId));
  if (filters.actorType) params.set('actorType', filters.actorType);
  if (filters.action) params.set('action', filters.action);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  const qs = params.toString();
  const data = await http<unknown>(`/admin/activity${qs ? `?${qs}` : ''}`);
  return activityListResponseSchema.parse(data);
}

export async function getAdminMerchants(): Promise<AdminMerchant[]> {
  const data = await http<unknown>('/admin/merchants');
  return z.array(adminMerchantSchema).parse(data);
}

export async function getAdminMerchantDetail(
  merchantId: number,
): Promise<AdminMerchantDetail> {
  const data = await http<unknown>(`/admin/merchants/${merchantId}`);
  return adminMerchantDetailSchema.parse(data);
}

export async function getAdminSuggestions(status?: SuggestionStatus): Promise<Suggestion[]> {
  const qs = status ? `?status=${status}` : '';
  const data = await http<unknown>(`/admin/suggestions${qs}`);
  return z.array(suggestionSchema).parse(data);
}

export async function updateAdminSuggestion(
  id: number,
  input: { status: SuggestionStatus; adminNote?: string },
): Promise<Suggestion> {
  const data = await http<unknown>(`/admin/suggestions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return suggestionSchema.parse(data);
}
