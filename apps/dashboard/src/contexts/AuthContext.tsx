import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '@/lib/api';
import { wsClient } from '@/lib/ws';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('execora_token');
    const userRaw = localStorage.getItem('execora_user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        setState({ user, token, isLoading: false, isAuthenticated: true });
        wsClient.connect(token);
        return;
      } catch {
        // invalid stored data — fall through
      }
    }
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  const login = useCallback(async (email: string, password: string, tenantId?: string) => {
    const { data } = await authApi.login(email, password, tenantId);
    const { accessToken, refreshToken, user } = data;
    localStorage.setItem('execora_token', accessToken);
    localStorage.setItem('execora_refresh', refreshToken);
    localStorage.setItem('execora_user', JSON.stringify(user));
    setState({ user, token: accessToken, isLoading: false, isAuthenticated: true });
    wsClient.connect(accessToken);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('execora_refresh');
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { /* ignore */ }
    localStorage.removeItem('execora_token');
    localStorage.removeItem('execora_refresh');
    localStorage.removeItem('execora_user');
    wsClient.disconnect();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
