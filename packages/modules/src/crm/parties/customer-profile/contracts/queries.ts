import { CustomerSearchResult } from '@execora/types';

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Rich Prisma customer record as returned by getCustomerById (includes invoices/reminders) */
export interface CustomerDetailRecord {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface GetCustomerByIdQuery {
  execute(id: string): Promise<CustomerDetailRecord | null>;
}

export interface SearchCustomersQuery {
  execute(q: string): Promise<CustomerSearchResult[]>;
}

export interface ListCustomersQuery {
  execute(limit?: number): Promise<CustomerSearchResult[]>;
}

export interface ListOverdueCustomersQuery {
  execute(): Promise<Array<{ id: string; name: string; balance: number; landmark?: string; phone?: string }>>;
}

export interface GetCommPrefsQuery {
  execute(customerId: string): Promise<unknown>;
}
