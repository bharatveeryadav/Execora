/**
 * Input — design system component (Sprint 2).
 */
import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { cn } from "../../lib/utils";
import { SIZES } from "../../lib/constants";
import { MAX_FONT_SIZE_MULTIPLIER } from "../../lib/typography";

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
        <Text
          style={{ fontSize: SIZES.FONT.sm }}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="font-medium text-slate-600 mb-1"
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor="#94a3b8"
        style={{
          minHeight: SIZES.TOUCH_MIN,
          paddingVertical: SIZES.SPACING.md,
          fontSize: SIZES.FONT.base,
        }}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        className={cn(
          "border border-slate-200 rounded-xl px-4 text-slate-800 bg-white",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && (
        <Text
          style={{ fontSize: SIZES.FONT.sm }}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="text-red-600 mt-1"
        >
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text
          style={{ fontSize: SIZES.FONT.sm }}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="text-slate-500 mt-1"
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
