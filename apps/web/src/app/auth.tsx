import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as authService from '../services/authService';
import { clearSession, restoreSession } from '../services/apiClient';
import type { UserProfile } from '../services/types';

type AuthContextValue = { user: UserProfile | null; loading: boolean; login: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient(); const [user, setUser] = useState<UserProfile | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; (async () => { try { if (await restoreSession()) { const profile = await authService.getMe(); if (active) setUser(profile); } } catch { clearSession(); } finally { if (active) setLoading(false); } })(); return () => { active = false; }; }, []);
  const value = useMemo<AuthContextValue>(() => ({ user, loading,
    login: async (email, password) => { await authService.login(email, password); setUser(await authService.getMe()); },
    register: async (name, email, password) => { await authService.register(name, email, password); setUser(await authService.getMe()); },
    logout: async () => { await authService.logout(); queryClient.clear(); setUser(null); }
  }), [user, loading, queryClient]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider'); return value; }

