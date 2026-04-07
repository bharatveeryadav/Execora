/**
 * sales/pos/billing/totals
 *
 * Feature: cart totals computation — subtotal, tax, discount, grand total, rounding.
 */
export interface CartTotals {
  subtotal: number;
  taxableAmount: number;
  taxAmount: number;
  discountAmount: number;
  roundOff: number;
  grandTotal: number;
}

export function computeCartTotals(
  lines: Array<{
    taxableAmount: number;
    taxAmount: number;
    discountAmount: number;
  }>,
): CartTotals {
  const subtotal = lines.reduce((s, l) => s + l.taxableAmount, 0);
  const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0);
  const discountAmount = lines.reduce((s, l) => s + l.discountAmount, 0);
  const raw = subtotal + taxAmount - discountAmount;
  const roundOff = Math.round(raw) - raw;
  return {
    subtotal,
    taxableAmount: subtotal,
    taxAmount,
    discountAmount,
    roundOff,
    grandTotal: Math.round(raw),
  };
}
