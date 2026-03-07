/**
 * Storage adapter using MMKV (react-native-mmkv).
 * MMKV is ~30x faster than AsyncStorage and synchronous — no await chains.
 * Swap with AsyncStorage if you can't use native modules (Expo Go).
 */
import { MMKV } from "react-native-mmkv";

export const storage = new MMKV({ id: "execora-storage" });

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
