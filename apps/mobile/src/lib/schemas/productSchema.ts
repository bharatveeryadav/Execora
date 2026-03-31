import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Item name is required").max(200, "Name too long"),
  sku: z.string().max(50).optional(),
  unit: z.string().default("pcs"),
  price: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: "Enter a valid sale price",
    })
    .default("0"),
  cost: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: "Enter a valid purchase price",
    })
    .default("0"),
  mrp: z
    .string()
    .refine((v) => v === "" || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), {
      message: "Enter a valid MRP",
    })
    .default(""),
  stock: z.string().default("0"),
  lowStockAlert: z.number().int().min(0).nullable().default(null),
  hsnCode: z.string().max(8).optional(),
  gstRate: z.number().min(0).max(28).default(0),
  barcode: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
