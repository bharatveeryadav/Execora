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
  apiFetch,
} from "@execora/shared";
import { tokenStorage } from "./storage";

// ── Extended invoice API ───────────────────────────────────────────────────────

export const invoiceExtApi = {
  cancel: (id: string) =>
    apiFetch<{ invoice: unknown }>(`/api/v1/invoices/${id}/cancel`, { method: 'POST' }),

  update: (id: string, data: { items?: Array<{ productName: string; quantity: number }>; notes?: string }) =>
    apiFetch<{ invoice: unknown }>(`/api/v1/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  sendEmail: (id: string) =>
    apiFetch<{ sent: boolean }>(`/api/v1/invoices/${id}/send-email`, { method: 'POST' }),
};

// ── Extended customer API ─────────────────────────────────────────────────────

export const customerExtApi = {
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/v1/customers/${id}`, { method: 'DELETE' }),

  getLedger: (id: string) =>
    apiFetch<{ entries: Array<{ id: string; type: string; description: string; amount: string | number; createdAt: string }> }>(
      `/api/v1/customers/${id}/ledger`
    ),

  getCommPrefs: (id: string) =>
    apiFetch<{ prefs: { whatsappEnabled?: boolean; whatsappNumber?: string; emailEnabled?: boolean; emailAddress?: string; smsEnabled?: boolean; preferredLanguage?: string } | null }>(
      `/api/v1/customers/${id}/comm-prefs`
    ),

  updateCommPrefs: (id: string, data: { whatsappEnabled?: boolean; whatsappNumber?: string; emailEnabled?: boolean; emailAddress?: string; smsEnabled?: boolean; preferredLanguage?: string }) =>
    apiFetch<{ prefs: unknown }>(`/api/v1/customers/${id}/comm-prefs`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ── Reminders API ─────────────────────────────────────────────────────────────

export const reminderApi = {
  list: (customerId?: string) =>
    apiFetch<{ reminders: Array<{ id: string; status: string; scheduledTime: string; message?: string }> }>(
      `/api/v1/reminders${customerId ? `?customerId=${customerId}` : ''}`
    ),

  create: (data: { customerId: string; amount?: number; datetime: string; message?: string }) =>
    apiFetch<{ reminder: unknown }>('/api/v1/reminders', {
      method: 'POST',
      body: JSON.stringify({
        customerId: data.customerId,
        amount: data.amount,
        scheduledTime: data.datetime,
        message: data.message,
      }),
    }),
};

// ── Payments API ──────────────────────────────────────────────────────────────

export const paymentApi = {
  record: (data: { customerId?: string; invoiceId?: string; amount: number; method: string; reference?: string; date?: string }) =>
    apiFetch<{ payment: unknown }>('/api/v1/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

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
