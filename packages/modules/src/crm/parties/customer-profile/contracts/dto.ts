import { CustomerSearchResult } from '@execora/types';

// ─── Inputs ───────────────────────────────────────────────────────────────────

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

// ─── Results ──────────────────────────────────────────────────────────────────

export type CustomerResult = CustomerSearchResult;

export interface DeleteCustomerResult {
  success: boolean;
}
