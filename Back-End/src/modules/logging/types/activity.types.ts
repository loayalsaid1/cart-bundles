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
  action?: string;
  severity?: ActivitySeverity;
  offerId?: number;
  limit?: number;
  offset?: number;
  excludeStorefront?: boolean;
}
