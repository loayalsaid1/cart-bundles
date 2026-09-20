export const TOKEN_EXPIRED_ERROR = 'TokenExpiredError';

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
  return status === 401 && extractApiErrorMessage(body) === TOKEN_EXPIRED_ERROR;
}
