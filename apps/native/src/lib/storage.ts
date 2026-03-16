import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
  clear: () => AsyncStorage.clear(),

  getJSON: async <T>(key: string): Promise<T | null> => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  },
  setJSON: (key: string, value: unknown) =>
    AsyncStorage.setItem(key, JSON.stringify(value)),
};

export const TOKEN_KEY   = 'execora_token';
export const REFRESH_KEY = 'execora_refresh';
export const USER_KEY    = 'execora_user';
export const API_BASE_KEY = 'execora_api_base';
