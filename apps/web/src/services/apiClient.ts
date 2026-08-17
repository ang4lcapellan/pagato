import type { AuthResponse } from './types';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5147/api/v1').replace(/\/$/, '');
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) { super(message); }
}

export function setAccessToken(token: string | null) { accessToken = token; }

async function readError(response: Response) {
  const fallback = response.status === 401 ? 'Tu sesión terminó. Inicia sesión nuevamente.' : 'No pudimos completar la solicitud.';
  try {
    const body = await response.json() as { title?: string; detail?: string; errors?: Record<string, string[]> };
    return new ApiError(response.status, body.detail || body.title || fallback, body.errors);
  } catch { return new ApiError(response.status, fallback); }
}

async function refreshSession() {
  if (!refreshPromise) refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceInfo: navigator.userAgent })
  }).then(async response => {
    if (!response.ok) { setAccessToken(null); return false; }
    const auth = await response.json() as AuthResponse; setAccessToken(auth.accessToken); return true;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return apiRequest<T>(path, init, false);
  }
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function restoreSession() { return refreshSession(); }
export function clearSession() { setAccessToken(null); }

