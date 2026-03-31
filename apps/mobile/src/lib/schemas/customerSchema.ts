import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GSTIN format",
    )
    .optional()
    .or(z.literal("")),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format")
    .optional()
    .or(z.literal("")),
  openingBalance: z.number().default(0),
  address: z.string().max(500).optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
