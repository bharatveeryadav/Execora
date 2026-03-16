import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage, TOKEN_KEY, REFRESH_KEY, USER_KEY } from '@/lib/storage';
import { authApi, setApiBase } from '@/lib/api';

interface AuthUser {
  id: string; tenantId: string; email: string;
  name: string; role: string; permissions: string[];
}

interface AuthState {
  user: AuthUser | null; token: string | null;
  isAuthenticated: boolean; isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, token: null, isAuthenticated: false, isLoading: true,
  });

  useEffect(() => {
    (async () => {
      const token = await storage.get(TOKEN_KEY);
      const user  = await storage.getJSON<AuthUser>(USER_KEY);
      setState({ user, token, isAuthenticated: !!(token && user), isLoading: false });
    })();
  }, []);

  const login = useCallback(async (email: string, password: string, tenantId?: string) => {
    const res = await authApi.login(email, password, tenantId);
    await storage.set(TOKEN_KEY,   res.accessToken);
    await storage.set(REFRESH_KEY, res.refreshToken);
    await storage.setJSON(USER_KEY, res.user);
    const user = res.user as AuthUser;
    setState({ user, token: res.accessToken, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await storage.remove(TOKEN_KEY);
    await storage.remove(REFRESH_KEY);
    await storage.remove(USER_KEY);
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
