/**
 * Badge — design system component (Sprint 2).
 * Variants: success, warning, danger, info, muted.
 */
import React from "react";
import { View, Text } from "react-native";
import { cn } from "../../lib/utils";

type Variant = "success" | "warning" | "danger" | "info" | "muted";

const variantStyles: Record<Variant, string> = {
  success: "bg-emerald-100",
  warning: "bg-amber-100",
  danger: "bg-red-100",
  info: "bg-primary/20",
  muted: "bg-slate-100",
};

const variantTextStyles: Record<Variant, string> = {
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
  info: "text-primary-700",
  muted: "text-slate-600",
};

export interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "muted",
  children,
  className,
}: BadgeProps) {
  return (
    <View
      className={cn(
        "px-2 py-0.5 rounded-full self-start",
        variantStyles[variant],
        className
      )}
    >
      <Text className={cn("text-xs font-semibold", variantTextStyles[variant])}>
        {children}
      </Text>
    </View>
  );
}
