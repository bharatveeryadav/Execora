export interface CreateCreditNoteItemInput {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  hsnCode?: string;
  gstRate?: number;
}

export interface CreateCreditNoteInput {
  invoiceId?: string;
  customerId?: string;
  reason?: string;
  reasonNote?: string;
  notes?: string;
  placeOfSupply?: string;
  buyerGstin?: string;
  reverseCharge?: boolean;
  items: CreateCreditNoteItemInput[];
}

export interface ListCreditNotesInput {
  limit?: number;
  customerId?: string;
  invoiceId?: string;
  status?: string;
}

export type CreditNoteRecord = Record<string, unknown>;
