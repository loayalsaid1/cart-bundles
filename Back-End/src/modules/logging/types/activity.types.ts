import type {
  activityActorTypeEnum,
  activitySeverityEnum,
} from '../../../database/entities/activity-logs';

export type ActivityActorType =
  (typeof activityActorTypeEnum)['enumValues'][number];

export type ActivitySeverity =
  (typeof activitySeverityEnum)['enumValues'][number];

export interface RecordActivityInput {
  merchantId?: number | null;
  actorType: ActivityActorType;
  actorId?: string | number | null;
  action: string;
  entityType?: string | null;
  entityId?: string | number | null;
  offerId?: number | null;
  severity?: ActivitySeverity;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ActivityListQuery {
  merchantId?: number;
  actorType?: ActivityActorType;
  action?: string;
  severity?: ActivitySeverity;
  search?: string;
  offerId?: number;
  limit?: number;
  offset?: number;
  excludeStorefront?: boolean;
}

export interface ActivityListResponse {
  items: Array<{
    id: number;
    merchantId: number | null;
    actorType: ActivityActorType;
    actorId: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    offerId: number | null;
    severity: ActivitySeverity;
    message: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }>;
  hasMore: boolean;
}
