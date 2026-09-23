export const TOKEN_EXPIRED_ERROR = 'TokenExpiredError';
// Add the exact string your backend guard throws when the cookie is missing/expired
export const MISSING_TOKEN_ERROR = 'Missing embed access token'; 

export function extractApiErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const raw = (body as { message?: unknown }).message;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    const nested = (raw as { message?: unknown }).message;
    if (typeof nested === 'string') return nested;
  }
  return null;
}

export function isTokenExpiredError(body: unknown, status: number): boolean {
  // If it's not a 401, it's a standard API error (like validation, 400, 422, etc)
  if (status !== 401) return false;

  const msg = extractApiErrorMessage(body);
  
  // Trigger embedded.destroy() if the token is mathematically expired (TokenExpiredError)
  // OR if the cookie naturally expired and was deleted by the browser (Missing token)
  // OR if the backend just threw a generic 'Unauthorized'
  return (
    msg === TOKEN_EXPIRED_ERROR || 
    msg === MISSING_TOKEN_ERROR ||
    msg === 'Unauthorized'
  );
}