import {
  CreateCustomerInput,
  UpdateCustomerInput,
  DeleteCustomerResult,
  UpsertCommPrefsInput,
} from './dto';

// ─── Commands ─────────────────────────────────────────────────────────────────

/** Minimal result shape returned from create/update — caller should not assume CustomerSearchResult shape */
export interface CustomerMutationResult {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface CreateCustomerCommand {
  execute(input: CreateCustomerInput): Promise<CustomerMutationResult>;
}

export interface UpdateCustomerCommand {
  execute(customerId: string, input: UpdateCustomerInput): Promise<CustomerMutationResult>;
}

export interface UpdateBalanceCommand {
  execute(customerId: string, amount: number): Promise<void>;
}

export interface DeleteCustomerCommand {
  execute(customerId: string): Promise<DeleteCustomerResult>;
}

export interface UpsertCommPrefsCommand {
  execute(customerId: string, prefs: UpsertCommPrefsInput): Promise<unknown>;
}
