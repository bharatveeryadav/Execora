import type { CreateInvoiceInput, CreateInvoiceResult } from "./dto";

export interface CreateInvoiceCommand {
  execute(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
}
