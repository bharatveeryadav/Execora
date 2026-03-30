/**
 * AmountText — ₹ formatted with optional credit/debit color (Sprint 2).
 */
import React from "react";
export interface AmountTextProps {
    amount: number | string;
    type?: "credit" | "debit" | "neutral";
    className?: string;
}
export declare function AmountText({ amount, type, className, }: AmountTextProps): React.JSX.Element;
//# sourceMappingURL=AmountText.d.ts.map