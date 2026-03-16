/**
 * AmountText — ₹ formatted with optional credit/debit color (Sprint 2).
 */
import React from "react";
import { Text } from "react-native";
import { formatCurrency } from "../../lib/utils";
import { cn } from "../../lib/utils";

export interface AmountTextProps {
  amount: number | string;
  type?: "credit" | "debit" | "neutral";
  className?: string;
}

export function AmountText({
  amount,
  type = "neutral",
  className,
}: AmountTextProps) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const colorClass =
    type === "credit"
      ? "text-emerald-600"
      : type === "debit"
        ? "text-red-600"
        : "text-slate-800";

  return (
    <Text className={cn("font-semibold", colorClass, className)}>
      {formatCurrency(n)}
    </Text>
  );
}
