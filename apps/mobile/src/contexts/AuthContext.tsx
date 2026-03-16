/**
 * AuthContext — provides isLoggedIn, user, login, logout for the app.
 * Enables Settings screen to trigger logout and re-render.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { tokenStorage, storage, USER_KEY } from "../lib/storage";
import { authApi } from "../lib/api";

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

type AuthContextValue = {
  isLoggedIn: boolean;
  user: AuthUser | null;
  login: () => void;
  loginWithUser: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = storage.getString(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  if (user) storage.set(USER_KEY, JSON.stringify(user));
  else storage.delete(USER_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!tokenStorage.getToken());
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  useEffect(() => {
    if (isLoggedIn && tokenStorage.getToken() && !user) {
      authApi.me().then((d) => {
        const u = (d.user as AuthUser) ?? null;
        if (u) {
          setUser(u);
          saveUser(u);
        }
      }).catch(() => {});
    }
  }, [isLoggedIn, user]);

  const login = useCallback(() => setIsLoggedIn(true), []);
  const loginWithUser = useCallback((u: AuthUser) => {
    setUser(u);
    saveUser(u);
    setIsLoggedIn(true);
  }, []);
  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    setUser(null);
    saveUser(null);
    setIsLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, loginWithUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
