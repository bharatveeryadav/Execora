import type { AccountStatement } from "./types";
/**
 * Generate a customer account statement.
 *
 * Opening balance is computed from all invoices and payments before `from`
 * (invoices increase the balance; payments, credit notes decrease it).
 *
 * @param tenantId   Tenant scope
 * @param customerId Target customer
 * @param from       Statement period start (inclusive)
 * @param to         Statement period end (inclusive)
 */
export declare function getAccountStatement(tenantId: string, customerId: string, from: Date, to: Date): Promise<AccountStatement>;
//# sourceMappingURL=account-statement.d.ts.map