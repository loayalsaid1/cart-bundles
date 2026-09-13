import { z } from 'zod';
import { http } from '@/lib/http';
import { activityLogSchema, type ActivityLog } from '@/lib/schemas/activity';
import { adminLoginSchema, adminOverviewSchema, type AdminOverview } from '@/lib/schemas/admin';
import {
  suggestionSchema,
  type Suggestion,
  type SuggestionStatus,
} from '@/lib/schemas/suggestions';

export async function adminLogin(password: string): Promise<{ success: boolean }> {
  const data = await http<unknown>('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
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
  action?: string;
  severity?: string;
  limit?: number;
} = {}): Promise<ActivityLog[]> {
  const params = new URLSearchParams();
  if (filters.merchantId) params.set('merchantId', String(filters.merchantId));
  if (filters.action) params.set('action', filters.action);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  const data = await http<unknown>(`/admin/activity${qs ? `?${qs}` : ''}`);
  return z.array(activityLogSchema).parse(data);
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
