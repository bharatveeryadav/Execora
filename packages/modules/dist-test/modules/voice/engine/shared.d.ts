import type { CustomerSearchResult, ExecutionResult } from "@execora/types";
export declare function toNum(value: unknown, fallback?: number): number;
export interface CustomerResolution {
    customer: CustomerSearchResult | null;
    multiple: boolean;
    candidates?: CustomerSearchResult[];
    query?: string;
}
/**
 * Multi-stage customer resolution used by every intent handler that needs a customer.
 *
 * Stage 1: In-memory cache (sub-ms, lives for the process lifetime)
 * Stage 2: Redis fallback (survives process restart within the same conversation)
 * Stage 3: DB search with ranking
 *
 * Sets the resolved customer as active so pronoun references ("uska", "iska")
 * work correctly in subsequent turns.
 */
export declare function resolveCustomer(entities: Record<string, any>, conversationId?: string): Promise<CustomerResolution>;
/**
 * Build a TTS-friendly item summary.
 * Format: "4 kg Cheeni ₹180, 6 kg Aata ₹240"
 * Auto-created products are flagged with ⚠️ naya so the shopkeeper notices ₹0 price.
 */
export declare function formatItemsSummary(items: Array<Record<string, any>>): string;
/**
 * Generate invoice PDF, upload to MinIO, and persist the URL.
 * Non-fatal at every stage: failures here never block the invoice flow.
 */
export declare function buildAndStoreInvoicePdf(invoice: Record<string, any>, customerName: string, resolvedItems: Array<Record<string, any>>, shopName: string, upiVpa?: string): Promise<{
    pdfBuffer?: Buffer;
    pdfUrl?: string;
    pdfObjectKey?: string;
}>;
/**
 * Fire invoice email and/or WhatsApp (gated by per-tenant autoSendEmail / autoSendWhatsApp flags).
 * Respects the same Settings toggles as the manual billing flow.
 * Called from both CREATE_INVOICE (autoSend) and CONFIRM_INVOICE paths.
 */
export declare function sendConfirmedInvoiceEmail(invoice: Record<string, any>, customerId: string, customerEmail: string | null, customerName: string, resolvedItems: Array<Record<string, any>>, conversationId?: string): Promise<ExecutionResult>;
//# sourceMappingURL=shared.d.ts.map