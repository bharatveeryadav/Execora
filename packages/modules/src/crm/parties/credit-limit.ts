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
export async function setCreditLimit(input: SetCreditLimitInput): Promise<CreditLimitRecord> {
  return {
    customerId: input.customerId,
    tenantId: input.tenantId,
    creditLimitAmount: input.creditLimitAmount,
    currentOutstanding: 0,
    availableCredit: input.creditLimitAmount,
    lastUpdated: new Date(),
  };
}
export async function getCreditLimitStatus(
  _tenantId: string,
  _customerId: string
): Promise<CreditLimitRecord | null> {
  return null;
}
export async function checkCreditAvailability(
  _tenantId: string,
  _customerId: string,
  _amount: number
): Promise<{ allowed: boolean; reason?: string }> {
  return { allowed: true };
}
