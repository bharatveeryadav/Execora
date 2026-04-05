import { invoiceService } from "../../../modules/invoice/invoice.service";
import type { CreateInvoiceCommand } from "./contracts/commands";
import type { CreateInvoiceInput, CreateInvoiceResult } from "./contracts/dto";

/**
 * Compatibility adapter for phased migration:
 * routes can call this feature contract while legacy invoice service remains intact.
 */
class LegacyCreateInvoiceCommand implements CreateInvoiceCommand {
  async execute(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    return invoiceService.createInvoice(
      input.customerId,
      input.items,
      input.notes,
      input.options ?? {},
    );
  }
}

export const createInvoiceCommand: CreateInvoiceCommand =
  new LegacyCreateInvoiceCommand();

export type { CreateInvoiceInput, CreateInvoiceResult } from "./contracts/dto";
export type { CreateInvoiceCommand } from "./contracts/commands";
