import React from "react";
import { Text, View } from "react-native";
import { cn } from "../../lib/utils";

export interface FormRowProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormRow({
  label,
  hint,
  error,
  children,
  className,
}: FormRowProps) {
  return (
    <View className={cn("mb-4", className)}>
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </Text>
      {children}
      {error ? (
        <Text className="mt-1 text-xs text-red-600">{error}</Text>
      ) : null}
      {!error && hint ? (
        <Text className="mt-1 text-xs text-slate-500">{hint}</Text>
      ) : null}
    </View>
  );
}
