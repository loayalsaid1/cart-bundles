import { z } from 'zod';
import { http } from '@/lib/http';
import {
  activityLogSchema,
  merchantHealthSchema,
  type ActivityLog,
  type MerchantHealth,
} from '@/lib/schemas/activity';

export async function getMerchantHealth(): Promise<MerchantHealth> {
  const data = await http<unknown>('/activity/status');
  return merchantHealthSchema.parse(data);
}

export async function getActivityLogs(filters: {
  action?: string;
  severity?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ActivityLog[]> {
  const params = new URLSearchParams();
  if (filters.action) params.set('action', filters.action);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  const qs = params.toString();
  const data = await http<unknown>(`/activity${qs ? `?${qs}` : ''}`);
  return z.array(activityLogSchema).parse(data);
}
