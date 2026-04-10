/**
 * sales/invoicing/documents/recurring
 *
 * Feature: recurring invoice scheduling — auto-generate invoices on a schedule.
 */
export interface RecurringInvoiceSchedule {
    id: string;
    tenantId: string;
    customerId: string;
    frequency: "weekly" | "monthly" | "quarterly" | "yearly";
    nextRunAt: string;
    lastRunAt?: string;
    active: boolean;
    templateInvoiceId: string;
}
export declare function createRecurringSchedule(_tenantId: string, _input: Omit<RecurringInvoiceSchedule, "id" | "lastRunAt">): Promise<RecurringInvoiceSchedule>;
export declare function listRecurringSchedules(_tenantId: string): Promise<RecurringInvoiceSchedule[]>;
export declare function pauseRecurringSchedule(_id: string): Promise<void>;
export declare function resumeRecurringSchedule(_id: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map