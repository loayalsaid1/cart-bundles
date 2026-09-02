/**
 * Response from Salla's token endpoint (authorization_code + refresh_token grants).
 * `expires` / `expires_in` are durations in seconds (access tokens live ~14 days).
 */
export interface SallaOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires?: number;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Response from `GET /oauth2/user/info`. The merchant (store) id is used to
 * key the `merchants` table; the user id is the person who authorized the app.
 */
export interface SallaUserInfoResponse {
  success: boolean;
  data?: {
    id: number;
    name?: string;
    email?: string;
    merchant?: {
      id: number;
      name?: string;
      username?: string;
    };
  };
}
