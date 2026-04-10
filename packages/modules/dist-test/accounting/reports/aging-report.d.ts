import type { AgingReport } from "./types";
/**
 * Generate the accounts-receivable aging report for a tenant.
 *
 * @param tenantId  Tenant to scope query to
 * @param asOf      Reference date (defaults to now)
 */
export declare function getAgingReport(tenantId: string, asOf?: Date): Promise<AgingReport>;
//# sourceMappingURL=aging-report.d.ts.map