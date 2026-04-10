/**
 * crm/parties/credit-limit
 *
 * Feature: set and check credit limits for customers.
 * Stub — requires credit_limit field on customer model (⏳).
 */
export interface CreditLimitRecord {
    customerId: string;
    tenantId: string;
    creditLimitAmount: number;
    currentOutstanding: number;
    availableCredit: number;
    lastUpdated: Date;
}
export interface SetCreditLimitInput {
    tenantId: string;
    customerId: string;
    creditLimitAmount: number;
    setBy?: string;
}
export declare function setCreditLimit(input: SetCreditLimitInput): Promise<CreditLimitRecord>;
export declare function getCreditLimitStatus(_tenantId: string, _customerId: string): Promise<CreditLimitRecord | null>;
export declare function checkCreditAvailability(_tenantId: string, _customerId: string, _amount: number): Promise<{
    allowed: boolean;
    reason?: string;
}>;
//# sourceMappingURL=credit-limit.d.ts.map