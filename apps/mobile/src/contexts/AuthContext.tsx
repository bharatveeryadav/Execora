/**
 * AuthContext — provides isLoggedIn, login, logout for the app.
 * Enables Settings screen to trigger logout and re-render.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { tokenStorage } from "../lib/storage";
import { authApi } from "../lib/api";

type AuthContextValue = {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!tokenStorage.getToken());

  const login = useCallback(() => setIsLoggedIn(true), []);
  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    setIsLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
