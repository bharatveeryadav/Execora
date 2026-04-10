import type { OutstandingReceivablesReport } from "./types";
/**
 * Generate the outstanding receivables report.
 *
 * @param tenantId    Tenant scope
 * @param customerId  Optional — filter to a single customer
 * @param asOf        Reference date (defaults to now)
 * @param maxAgeDays  Optional upper limit on invoice age (e.g. 365)
 */
export declare function getOutstandingReceivables(tenantId: string, opts?: {
    customerId?: string;
    asOf?: Date;
    maxAgeDays?: number;
}): Promise<OutstandingReceivablesReport>;
//# sourceMappingURL=outstanding-receivables.d.ts.map