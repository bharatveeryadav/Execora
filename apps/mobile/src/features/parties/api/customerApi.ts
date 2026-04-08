import { apiFetch, customerApi } from "@execora/shared";

export const customerExtApi = {
  create: (data: {
    name: string;
    phone?: string;
    email?: string;
    nickname?: string;
    landmark?: string;
    notes?: string;
    openingBalance?: number;
    creditLimit?: number;
    tags?: string[];
  }) =>
    apiFetch<{ customer: unknown }>("/api/v1/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/v1/customers/${id}`, {
      method: "DELETE",
    }),

  getLedger: (id: string) =>
    apiFetch<{
      entries: Array<{
        id: string;
        type: string;
        description: string;
        amount: string | number;
        createdAt: string;
      }>;
    }>(`/api/v1/customers/${id}/ledger`),

  getCommPrefs: (id: string) =>
    apiFetch<{
      prefs: {
        whatsappEnabled?: boolean;
        whatsappNumber?: string;
        emailEnabled?: boolean;
        emailAddress?: string;
        smsEnabled?: boolean;
        preferredLanguage?: string;
      } | null;
    }>(`/api/v1/customers/${id}/communication-prefs`),

  updateCommPrefs: (
    id: string,
    data: {
      whatsappEnabled?: boolean;
      whatsappNumber?: string;
      emailEnabled?: boolean;
      emailAddress?: string;
      smsEnabled?: boolean;
      preferredLanguage?: string;
    },
  ) =>
    apiFetch<{ prefs: unknown }>(`/api/v1/customers/${id}/communication-prefs`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const reminderApi = {
  list: (customerId?: string) =>
    apiFetch<{
      reminders: Array<{
        id: string;
        status: string;
        scheduledTime: string;
        message?: string;
      }>;
    }>(`/api/v1/reminders${customerId ? `?customerId=${customerId}` : ""}`) as Promise<{
      reminders: Array<{
        id: string;
        customerId?: string;
        amount?: number;
        status: string;
        scheduledTime: string;
        message?: string;
      }>;
    }>,

  create: (data: {
    customerId: string;
    amount?: number;
    datetime: string;
    message?: string;
  }) =>
    apiFetch<{ reminder: unknown }>("/api/v1/reminders", {
      method: "POST",
      body: JSON.stringify({
        customerId: data.customerId,
        amount: data.amount,
        datetime: data.datetime,
        message: data.message,
      }),
    }),

  bulkCreate: (data: {
    customerIds: string[];
    message?: string;
    daysOffset?: number;
  }) =>
    apiFetch<{
      reminders: Array<{
        id: string;
        customerId?: string;
        status: string;
        scheduledTime: string;
      }>;
    }>("/api/v1/reminders/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancel: (id: string) =>
    apiFetch<{ reminder: unknown }>(`/api/v1/reminders/${id}/cancel`, {
      method: "POST",
    }),
};

export { customerApi };
