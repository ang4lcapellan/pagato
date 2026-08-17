import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthProvider } from './auth';

type Theme = 'light' | 'dark' | 'system';
type UiContextValue = { theme: Theme; setTheme: (theme: Theme) => void; amountsHidden: boolean; toggleAmounts: () => void };
const UiContext = createContext<UiContextValue | null>(null);
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

export function AppProviders({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('pagato-theme') as Theme) || 'system');
  const [amountsHidden, setAmountsHidden] = useState(() => localStorage.getItem('pagato-private') === 'true');
  useEffect(() => {
    const root = document.documentElement;
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
  }, [theme]);
  const value = useMemo(() => ({ theme, setTheme: (next: Theme) => { localStorage.setItem('pagato-theme', next); setThemeState(next); }, amountsHidden, toggleAmounts: () => setAmountsHidden((current) => { localStorage.setItem('pagato-private', String(!current)); return !current; }) }), [theme, amountsHidden]);
  return <QueryClientProvider client={queryClient}><AuthProvider><UiContext.Provider value={value}>{children}</UiContext.Provider></AuthProvider></QueryClientProvider>;
}

export function useUi() { const value = useContext(UiContext); if (!value) throw new Error('useUi debe usarse dentro de AppProviders'); return value; }
