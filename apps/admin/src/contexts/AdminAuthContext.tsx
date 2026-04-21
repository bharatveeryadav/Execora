import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getAdminKey, setAdminKey, clearAdminKey, adminGetHealth } from "@/lib/admin-api";

interface AdminAuthContext {
  isAuthenticated: boolean;
  isVerifying: boolean;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
}

const Ctx = createContext<AdminAuthContext | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  // On mount, verify the stored key is still valid
  useEffect(() => {
    const key = getAdminKey();
    if (!key) { setIsVerifying(false); return; }
    adminGetHealth()
      .then(() => setIsAuthenticated(true))
      .catch(() => { clearAdminKey(); setIsAuthenticated(false); })
      .finally(() => setIsVerifying(false));
  }, []);

  async function login(key: string): Promise<boolean> {
    setAdminKey(key);
    try {
      await adminGetHealth();
      setIsAuthenticated(true);
      return true;
    } catch {
      clearAdminKey();
      setIsAuthenticated(false);
      return false;
    }
  }

  function logout() {
    clearAdminKey();
    setIsAuthenticated(false);
  }

  return <Ctx.Provider value={{ isAuthenticated, isVerifying, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth(): AdminAuthContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
