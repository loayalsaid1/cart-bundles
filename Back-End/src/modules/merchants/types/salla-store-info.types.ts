export interface SallaStoreInfoResponse {
  success?: boolean;
  data?: {
    id?: number;
    name?: string;
    email?: string;
    domain?: string;
    avatar?: string;
  };
}

export interface MerchantProfileFields {
  storeName: string | null;
  storeEmail: string | null;
  storeDomain: string | null;
  avatar: string | null;
}
