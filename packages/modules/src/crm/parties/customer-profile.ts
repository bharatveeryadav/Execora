/**
 * CRM / Parties — customer operations.
 * Re-exports from the canonical flat domain file (crm/customer.ts).
 * Kept for backwards-compatibility with any existing imports.
 */

export {
  createCustomer,
  updateCustomer,
  updateCustomerBalance,
  deleteCustomer,
  getCustomerById,
  getCustomerBalance,
  searchCustomers,
  listCustomers,
  listOverdueCustomers,
  getTotalPending,
  upsertCustomerCommPrefs,
  getCustomerCommPrefs,
} from "../customer";

// ─── Type re-exports ──────────────────────────────────────────────────────────

export type {
  CreateCustomerInput,
  UpdateCustomerInput,
  UpsertCommPrefsInput,
  CustomerMutationResult,
  CustomerDetailRecord,
  DeleteCustomerResult,
} from "./types";
