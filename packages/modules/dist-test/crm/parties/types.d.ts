import type { CustomerSearchResult } from "@execora/types";
export interface CreateCustomerInput {
    name: string;
    phone?: string;
    email?: string;
    nickname?: string;
    landmark?: string;
    notes?: string;
    openingBalance?: number;
    creditLimit?: number;
    tags?: string[];
}
export interface UpdateCustomerInput {
    name?: string;
    phone?: string;
    email?: string;
    nickname?: string;
    landmark?: string;
    creditLimit?: number;
    tags?: string[];
    notes?: string;
    balance?: number;
}
export interface UpsertCommPrefsInput {
    whatsappEnabled?: boolean;
    whatsappNumber?: string;
    emailEnabled?: boolean;
    emailAddress?: string;
    smsEnabled?: boolean;
    preferredLanguage?: string;
}
/** Minimal result from create/update — does not assume CustomerSearchResult shape */
export interface CustomerMutationResult {
    id: string;
    name: string;
    [key: string]: unknown;
}
/** Rich Prisma record returned by getCustomerById (includes invoices/reminders) */
export interface CustomerDetailRecord {
    id: string;
    name: string;
    [key: string]: unknown;
}
export interface DeleteCustomerResult {
    success: boolean;
}
export type { CustomerSearchResult };
//# sourceMappingURL=types.d.ts.map