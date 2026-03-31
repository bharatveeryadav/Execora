import { z } from "zod";

// ── Billing item row ──────────────────────────────────────────────────────────

export const billingItemSchema = z.object({
  id: z.number(),
  productId: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  qty: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: "Quantity must be greater than 0",
  }),
  rate: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
    message: "Rate must be a valid number",
  }),
  unit: z.string().default("pcs"),
  discount: z.string().default("0"),
  hsnCode: z.string().optional(),
  amount: z.number().min(0),
});

// ── Payment split ─────────────────────────────────────────────────────────────

export const paymentSplitSchema = z.object({
  id: z.number(),
  mode: z.enum(["cash", "upi", "card", "credit"]),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0),
});

// ── Document type discriminated union ─────────────────────────────────────────

export const documentTypeSchema = z.enum([
  "invoice",
  "quotation",
  "proforma",
  "sales_order",
  "delivery_challan",
  "bill_of_supply",
  "pos_sale",
]);

// ── Full billing form ─────────────────────────────────────────────────────────

export const billingFormSchema = z
  .object({
    documentType: documentTypeSchema.default("invoice"),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    items: z.array(billingItemSchema).min(1, "Add at least one item"),
    withGst: z.boolean().default(false),
    discountPct: z.string().default("0"),
    discountFlat: z.string().default("0"),
    paymentMode: z.enum(["cash", "upi", "card", "credit"]).default("cash"),
    paymentAmount: z.string().default("0"),
    splitEnabled: z.boolean().default(false),
    splits: z.array(paymentSplitSchema).default([]),
    notes: z.string().max(500).default(""),
    buyerGstin: z.string().optional(),
    dueDate: z.string().optional(),
  })
  .refine(
    (data) => {
      // Customer required for non-POS invoices
      if (data.documentType !== "pos_sale") {
        return !!data.customerId || !!data.customerName;
      }
      return true;
    },
    {
      message: "Please select a customer",
      path: ["customerId"],
    },
  );

export type BillingFormValues = z.infer<typeof billingFormSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type BillingItemValues = z.infer<typeof billingItemSchema>;
