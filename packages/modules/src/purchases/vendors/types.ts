// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface CreateSupplierInput {
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
}

export interface ListSuppliersInput {
  q?: string;
  limit?: number;
}

// ─── Result shapes ────────────────────────────────────────────────────────────

export interface SupplierRecord {
  id: string;
  name: string;
  tenantId: string;
  [key: string]: unknown;
}
