import { invoiceService } from "../../modules/invoice/invoice.service";
import type { CreateInvoiceInput, CreateInvoiceResult } from "./types";

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  return invoiceService.createInvoice(
    input.customerId,
    input.items,
    input.notes,
    input.options ?? {},
  );
}

export type { CreateInvoiceInput, CreateInvoiceResult } from "./types";
