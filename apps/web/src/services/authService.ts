import { apiRequest, clearSession, setAccessToken } from './apiClient';
import type { AuthResponse, UserProfile } from './types';

export async function login(email: string, password: string) {
  const result = await apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, deviceInfo: navigator.userAgent }) }, false);
  setAccessToken(result.accessToken); return result;
}
export async function register(displayName: string, email: string, password: string) {
  const result = await apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }, false);
  setAccessToken(result.accessToken); return result;
}
export const getMe = () => apiRequest<UserProfile>('/auth/me');
export async function logout() { try { await apiRequest<void>('/auth/logout', { method: 'POST' }, false); } finally { clearSession(); } }

