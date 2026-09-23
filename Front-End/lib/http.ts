import { redirect } from '@/i18n/routing';
import {
  extractApiErrorMessage,
  isTokenExpiredError,
} from '@/lib/http-error';
import { getLocale } from 'next-intl/server';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  '/api/v1';

let expiryHandled = false;

async function handleTokenExpiry(): Promise<void> {
  if (typeof window === 'undefined' || expiryHandled) return;
  expiryHandled = true;
  if (window.location.pathname.includes('/admin')) {
    // redirect to admin login
    const locale = await getLocale();
    redirect({ href: "/login", locale: locale })
    return;
  }
  const { embedded } = await import('@salla.sa/embedded-sdk');
  embedded.destroy();
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (isTokenExpiredError(body, res.status)) {
      await handleTokenExpiry();
    }
    const message =
      extractApiErrorMessage(body) ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
