/** Queries (read DTOs) for sales/invoicing/create-invoice */
export interface GetInvoiceByIdQuery { tenantId: string; invoiceId: string; }
export interface GetCustomerInvoicesQuery { tenantId: string; customerId: string; page?: number; limit?: number; }
export interface GetSummaryRangeQuery { tenantId: string; from: Date; to: Date; }
