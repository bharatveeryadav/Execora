/**
 * Storage adapter using MMKV (react-native-mmkv).
 * MMKV is ~30x faster than AsyncStorage and synchronous — no await chains.
 * Falls back to in-memory storage when MMKV is unavailable (Expo Go).
 */
import { MMKV } from "react-native-mmkv";

function createStorage(): {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
} {
  try {
    return new MMKV({ id: "execora-storage" });
  } catch {
    const mem: Record<string, string> = {};
    return {
      getString: (k) => mem[k],
      set: (k, v) => { mem[k] = v; },
      delete: (k) => { delete mem[k]; },
    };
  }
}

export const storage = createStorage();

export const TOKEN_KEY = "execora_token";
export const REFRESH_KEY = "execora_refresh";
export const USER_KEY = "execora_user";
export const DRAFT_KEY = "execora_draft_v1";

export const tokenStorage = {
  getToken: (): string | null => storage.getString(TOKEN_KEY) ?? null,
  getRefreshToken: (): string | null => storage.getString(REFRESH_KEY) ?? null,
  setTokens: (access: string, refresh: string): void => {
    storage.set(TOKEN_KEY, access);
    storage.set(REFRESH_KEY, refresh);
  },
  clearTokens: (): void => {
    storage.delete(TOKEN_KEY);
    storage.delete(REFRESH_KEY);
    storage.delete(USER_KEY);
  },
};
