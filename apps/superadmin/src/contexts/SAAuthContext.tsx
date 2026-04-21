import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getSAKey, setSAKey, clearSAKey, saGetHealth } from "@/lib/sa-api";

interface SAAuthContext {
  isAuthenticated: boolean;
  isVerifying: boolean;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
}

const Ctx = createContext<SAAuthContext | null>(null);

export function SAAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const key = getSAKey();
    if (!key) { setIsVerifying(false); return; }
    saGetHealth()
      .then(() => setIsAuthenticated(true))
      .catch(() => { clearSAKey(); setIsAuthenticated(false); })
      .finally(() => setIsVerifying(false));
  }, []);

  async function login(key: string): Promise<boolean> {
    setSAKey(key);
    try {
      await saGetHealth();
      setIsAuthenticated(true);
      return true;
    } catch {
      clearSAKey();
      setIsAuthenticated(false);
      return false;
    }
  }

  function logout() {
    clearSAKey();
    setIsAuthenticated(false);
  }

  return <Ctx.Provider value={{ isAuthenticated, isVerifying, login, logout }}>{children}</Ctx.Provider>;
}

export function useSAAuth(): SAAuthContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSAAuth must be used inside SAAuthProvider");
  return ctx;
}
