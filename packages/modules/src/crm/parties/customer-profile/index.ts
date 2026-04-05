/**
 * CRM / parties / customer-profile
 *
 * Compatibility adapters that implement the module contracts by delegating to
 * the legacy CustomerService.  Routes depend on these stable interfaces so the
 * underlying implementation can be replaced without touching route code.
 */
import { customerService } from '../../../modules/customer/customer.service';
import { CreateCustomerInput, UpdateCustomerInput, UpsertCommPrefsInput } from './contracts/dto';
import {
  CreateCustomerCommand,
  UpdateCustomerCommand,
  UpdateBalanceCommand,
  DeleteCustomerCommand,
  UpsertCommPrefsCommand,
} from './contracts/commands';
import {
  GetCustomerByIdQuery,
  SearchCustomersQuery,
  ListCustomersQuery,
  ListOverdueCustomersQuery,
  GetCommPrefsQuery,
} from './contracts/queries';

// ─── Commands ─────────────────────────────────────────────────────────────────

class LegacyCreateCustomerCommand implements CreateCustomerCommand {
  async execute(input: CreateCustomerInput) {
    const { openingBalance, creditLimit, email, tags, ...rest } = input;
    const customer = await customerService.createCustomer(rest);
    const extras: { email?: string; tags?: string[]; creditLimit?: number } = {};
    if (email) extras.email = email;
    if (tags?.length) extras.tags = tags;
    if (creditLimit !== undefined && creditLimit > 0) extras.creditLimit = creditLimit;
    if (Object.keys(extras).length) await customerService.updateProfile(customer.id, extras);
    if (openingBalance && openingBalance > 0) await customerService.updateBalance(customer.id, openingBalance);
    return (await customerService.getCustomerById(customer.id)) ?? customer;
  }
}

class LegacyUpdateCustomerCommand implements UpdateCustomerCommand {
  async execute(customerId: string, input: UpdateCustomerInput) {
    return customerService.updateProfile(customerId, input);
  }
}

class LegacyUpdateBalanceCommand implements UpdateBalanceCommand {
  async execute(customerId: string, amount: number) {
    await customerService.updateBalance(customerId, amount);
  }
}

class LegacyDeleteCustomerCommand implements DeleteCustomerCommand {
  async execute(customerId: string) {
    return customerService.deleteCustomerAndAllData(customerId);
  }
}

class LegacyUpsertCommPrefsCommand implements UpsertCommPrefsCommand {
  async execute(customerId: string, prefs: UpsertCommPrefsInput) {
    return customerService.upsertCommPrefs(customerId, prefs);
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

class LegacyGetCustomerByIdQuery implements GetCustomerByIdQuery {
  async execute(id: string) {
    return customerService.getCustomerById(id);
  }
}

class LegacySearchCustomersQuery implements SearchCustomersQuery {
  async execute(q: string) {
    return customerService.searchCustomer(q);
  }
}

class LegacyListCustomersQuery implements ListCustomersQuery {
  async execute(limit = 200) {
    return customerService.listAllCustomers(limit);
  }
}

class LegacyListOverdueCustomersQuery implements ListOverdueCustomersQuery {
  async execute() {
    return customerService.getAllCustomersWithPendingBalance();
  }
}

class LegacyGetCommPrefsQuery implements GetCommPrefsQuery {
  async execute(customerId: string) {
    return customerService.getCommPrefs(customerId);
  }
}

// ─── Singleton exports ────────────────────────────────────────────────────────

export const createCustomerCommand: CreateCustomerCommand = new LegacyCreateCustomerCommand();
export const updateCustomerCommand: UpdateCustomerCommand = new LegacyUpdateCustomerCommand();
export const updateBalanceCommand: UpdateBalanceCommand = new LegacyUpdateBalanceCommand();
export const deleteCustomerCommand: DeleteCustomerCommand = new LegacyDeleteCustomerCommand();
export const upsertCommPrefsCommand: UpsertCommPrefsCommand = new LegacyUpsertCommPrefsCommand();

export const getCustomerByIdQuery: GetCustomerByIdQuery = new LegacyGetCustomerByIdQuery();
export const searchCustomersQuery: SearchCustomersQuery = new LegacySearchCustomersQuery();
export const listCustomersQuery: ListCustomersQuery = new LegacyListCustomersQuery();
export const listOverdueCustomersQuery: ListOverdueCustomersQuery = new LegacyListOverdueCustomersQuery();
export const getCommPrefsQuery: GetCommPrefsQuery = new LegacyGetCommPrefsQuery();

export * from './contracts/dto';
export * from './contracts/commands';
export * from './contracts/queries';
