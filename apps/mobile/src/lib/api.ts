/**
 * Mobile API initializer.
 * Wires the shared platform-agnostic API client with MMKV token storage
 * and React Navigation auth-expiry handling.
 *
 * Call `bootApi()` once — inside App.tsx before QueryClientProvider renders.
 */
import {
  initApiClient,
  customerApi,
  productApi,
  invoiceApi,
  authApi,
} from "@execora/shared";
import { tokenStorage } from "./storage";

// ── Global auth-expiry callback ───────────────────────────────────────────────
// Set this after navigation is ready so we can navigate to the Login screen.
let _onAuthExpired: (() => void) | null = null;
export function setAuthExpiredHandler(fn: () => void): void {
  _onAuthExpired = fn;
}

export function bootApi(): void {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000"; // 10.0.2.2 = Android emulator host
  initApiClient({
    baseUrl: apiUrl,
    getToken: tokenStorage.getToken,
    getRefreshToken: tokenStorage.getRefreshToken,
    setTokens: tokenStorage.setTokens,
    clearTokens: tokenStorage.clearTokens,
    onAuthExpired: () => _onAuthExpired?.(),
  });
}

// Re-export the API functions so screens import from one place
export { customerApi, productApi, invoiceApi, authApi };
