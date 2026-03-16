/**
 * Input — design system component (Sprint 2).
 */
import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { cn } from "../../lib/utils";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  className,
  containerClassName,
  ...props
}: InputProps) {
  return (
    <View className={cn("mb-4", containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-slate-600 mb-1">{label}</Text>
      )}
      <TextInput
        placeholderTextColor="#94a3b8"
        className={cn(
          "border border-slate-200 rounded-xl px-4 min-h-[44px] py-3 text-base text-slate-800 bg-white",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && (
        <Text className="text-sm text-red-600 mt-1">{error}</Text>
      )}
      {hint && !error && (
        <Text className="text-xs text-slate-500 mt-1">{hint}</Text>
      )}
    </View>
  );
}
