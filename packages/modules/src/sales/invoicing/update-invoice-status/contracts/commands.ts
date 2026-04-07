/** Commands for sales/invoicing/update-invoice-status */
export interface UpdateInvoiceStatusCommand { tenantId: string; invoiceId: string; status: string; }
export interface CancelInvoiceCommand { tenantId: string; invoiceId: string; reason?: string; }
