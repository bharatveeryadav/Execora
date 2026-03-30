import { apiFetch, invoiceApi } from "@execora/shared";

export const invoiceExtApi = {
  cancel: (id: string) =>
    apiFetch<{ invoice: unknown }>(`/api/v1/invoices/${id}/cancel`, {
      method: "POST",
    }),

  update: (
    id: string,
    data: {
      items?: Array<{ productName: string; quantity: number }>;
      notes?: string;
    },
  ) =>
    apiFetch<{ invoice: unknown }>(`/api/v1/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  sendEmail: (id: string) =>
    apiFetch<{ sent: boolean }>(`/api/v1/invoices/${id}/send-email`, {
      method: "POST",
    }),
};

export { invoiceApi };
