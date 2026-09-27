import "server-only";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function isAdminSessionValid(cookieHeader: string): Promise<boolean> {
  if (!cookieHeader || !BACKEND_URL) return false;

  const baseUrl = BACKEND_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/v1/admin/session`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) {
    throw new Error(`Admin session check failed (${response.status})`);
  }
  return true;
}
