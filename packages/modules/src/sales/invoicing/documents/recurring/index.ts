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

export async function createRecurringSchedule(
  _tenantId: string,
  _input: Omit<RecurringInvoiceSchedule, "id" | "lastRunAt">,
): Promise<RecurringInvoiceSchedule> {
  throw new Error("Not implemented");
}

export async function listRecurringSchedules(
  _tenantId: string,
): Promise<RecurringInvoiceSchedule[]> {
  return [];
}

export async function pauseRecurringSchedule(_id: string): Promise<void> {}
export async function resumeRecurringSchedule(_id: string): Promise<void> {}
