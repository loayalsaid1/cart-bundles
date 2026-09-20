import type {
  MerchantProfileFields,
  SallaStoreInfoResponse,
} from './types/salla-store-info.types';

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapStoreInfo(
  payload: SallaStoreInfoResponse,
): MerchantProfileFields {
  const data = payload.data;
  return {
    storeName: nullableString(data?.name),
    storeEmail: nullableString(data?.email),
    storeDomain: nullableString(data?.domain),
    avatar: nullableString(data?.avatar),
  };
}
