import type { CreateInvoicePayload } from "@execora/shared";
export interface QueuedInvoice {
    id: string;
    payload: CreateInvoicePayload;
    displayTotal: number;
    notesWithDue: string;
    createdAt: string;
}
export declare function enqueueInvoice(payload: CreateInvoicePayload, displayTotal: number, notesWithDue: string): string;
export declare function getQueuedInvoices(): QueuedInvoice[];
export declare function removeFromQueue(id: string): void;
export declare function clearQueue(): void;
export declare function cacheProducts(products: unknown[]): void;
export declare function getCachedProducts(): unknown[];
export declare function cacheCustomers(customers: unknown[]): void;
export declare function getCachedCustomers(): unknown[];
//# sourceMappingURL=offlineQueue.d.ts.map