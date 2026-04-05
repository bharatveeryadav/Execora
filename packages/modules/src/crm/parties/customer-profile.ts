import { customerService } from "../../modules/customer/customer.service";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  UpsertCommPrefsInput,
  CustomerMutationResult,
  CustomerDetailRecord,
  DeleteCustomerResult,
} from "./types";
import type { CustomerSearchResult } from "@execora/types";

// ─── Commands ─────────────────────────────────────────────────────────────────

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CustomerMutationResult> {
  const { openingBalance, creditLimit, email, tags, ...rest } = input;
  const customer = await customerService.createCustomer(rest);
  const extras: { email?: string; tags?: string[]; creditLimit?: number } = {};
  if (email) extras.email = email;
  if (tags?.length) extras.tags = tags;
  if (creditLimit !== undefined && creditLimit > 0)
    extras.creditLimit = creditLimit;
  if (Object.keys(extras).length)
    await customerService.updateProfile(customer.id, extras);
  if (openingBalance && openingBalance > 0)
    await customerService.updateBalance(customer.id, openingBalance);
  return (await customerService.getCustomerById(customer.id)) ?? customer;
}

export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
): Promise<CustomerMutationResult> {
  return customerService.updateProfile(customerId, input);
}

export async function updateCustomerBalance(
  customerId: string,
  amount: number,
): Promise<void> {
  await customerService.updateBalance(customerId, amount);
}

export async function deleteCustomer(
  customerId: string,
): Promise<DeleteCustomerResult> {
  return customerService.deleteCustomerAndAllData(customerId);
}

export async function upsertCustomerCommPrefs(
  customerId: string,
  prefs: UpsertCommPrefsInput,
): Promise<unknown> {
  return customerService.upsertCommPrefs(customerId, prefs);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCustomerById(
  id: string,
): Promise<CustomerDetailRecord | null> {
  return customerService.getCustomerById(id);
}

export async function searchCustomers(
  q: string,
): Promise<CustomerSearchResult[]> {
  return customerService.searchCustomer(q);
}

export async function listCustomers(
  limit = 200,
): Promise<CustomerSearchResult[]> {
  return customerService.listAllCustomers(limit);
}

export async function listOverdueCustomers(): Promise<
  Array<{
    id: string;
    name: string;
    balance: number;
    landmark?: string;
    phone?: string;
  }>
> {
  return customerService.getAllCustomersWithPendingBalance();
}

export async function getCustomerCommPrefs(
  customerId: string,
): Promise<unknown> {
  return customerService.getCommPrefs(customerId);
}

// ─── Type re-exports ──────────────────────────────────────────────────────────

export type {
  CreateCustomerInput,
  UpdateCustomerInput,
  UpsertCommPrefsInput,
  CustomerMutationResult,
  CustomerDetailRecord,
  DeleteCustomerResult,
} from "./types";
