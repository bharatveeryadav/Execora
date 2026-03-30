/**
 * AiService — Sprint 2 AI Differentiators
 *
 * Three purely-DB-driven AI features (no external LLM needed):
 *  1. getReplenishmentSuggestions — stock velocity → reorder suggestions
 *  2. checkInvoiceAnomaly        — z-score vs customer history
 *  3. schedulePredictiveReminders — smart scheduling based on payment patterns
 *
 * OCR (purchase_bill + product_catalog) is handled by the BullMQ OCR worker
 * in packages/infrastructure/src/workers.ts.
 */
export interface ReplenishmentSuggestion {
    productId: string;
    productName: string;
    currentStock: number;
    minStock: number;
    suggestedOrderQty: number;
    urgency: 'critical' | 'high' | 'normal';
    /** Units sold in the last 30 days */
    velocity30d: number;
    preferredSupplier: string | null;
}
export interface AnomalyResult {
    isAnomaly: boolean;
    severity: 'none' | 'low' | 'medium' | 'high';
    message: string;
    expectedRange: {
        min: number;
        max: number;
    };
}
export interface PredictiveReminderResult {
    scheduled: number;
    skipped: number;
}
declare class AiService {
    /**
     * Returns products where stock ≤ minStock with a suggested reorder quantity
     * computed from 30-day sales velocity. Sorted by urgency (critical first).
     */
    getReplenishmentSuggestions(): Promise<ReplenishmentSuggestion[]>;
    /**
     * Compares a proposed invoice total against the customer's last 10 invoices.
     * Uses a 3σ z-score rule: |z| > 2 → anomaly.
     * Requires at least 3 prior invoices; returns isAnomaly=false otherwise.
     */
    checkInvoiceAnomaly(customerId: string, proposedTotal: number): Promise<AnomalyResult>;
    /**
     * Scans invoices due in the next 7 days (or already overdue) and schedules
     * intelligent reminders. Known late-payers (averagePaymentDays > 25) get an
     * extra day of lead time. Skips invoices that already have a pending/sent reminder.
     */
    schedulePredictiveReminders(): Promise<PredictiveReminderResult>;
}
export declare const aiService: AiService;
export {};
//# sourceMappingURL=ai.service.d.ts.map