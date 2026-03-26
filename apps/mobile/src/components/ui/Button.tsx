/**
 * Button — design system component (Sprint 2).
 * Variants: primary, outline, ghost, danger; sizes: sm, md, lg.
 */
import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { cn } from "../../lib/utils";
import { hapticLight } from "../../lib/haptics";
import { SIZES } from "../../lib/constants";
import { MAX_FONT_SIZE_MULTIPLIER } from "../../lib/typography";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantContainerStyles: Record<Variant, string> = {
  primary: "bg-primary border-0",
  outline: "bg-transparent border-2 border-slate-300",
  ghost: "bg-transparent border-0",
  danger: "bg-red-600 border-0",
};

const variantTextStyles: Record<Variant, string> = {
  primary: "text-white",
  outline: "text-slate-800",
  ghost: "text-slate-700",
  danger: "text-white",
};

const sizeStyles: Record<
  Size,
  { minHeight: number; paddingHorizontal: number; paddingVertical: number }
> = {
  sm: {
    minHeight: SIZES.BUTTON.sm.minHeight,
    paddingHorizontal: SIZES.BUTTON.sm.paddingX,
    paddingVertical: SIZES.BUTTON.sm.paddingY,
  },
  md: {
    minHeight: SIZES.BUTTON.md.minHeight,
    paddingHorizontal: SIZES.BUTTON.md.paddingX,
    paddingVertical: SIZES.BUTTON.md.paddingY,
  },
  lg: {
    minHeight: SIZES.BUTTON.lg.minHeight,
    paddingHorizontal: SIZES.BUTTON.lg.paddingX,
    paddingVertical: SIZES.BUTTON.lg.paddingY,
  },
};

const sizeTextStyles: Record<Size, { fontSize: number }> = {
  sm: { fontSize: SIZES.BUTTON.sm.fontSize },
  md: { fontSize: SIZES.BUTTON.md.fontSize },
  lg: { fontSize: SIZES.BUTTON.lg.fontSize },
};

export interface ButtonProps {
  variant?: Variant;
  size?: Size;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  onPress,
  disabled,
  loading,
  children,
  className,
  textClassName,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (!isDisabled && onPress) {
      hapticLight();
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={sizeStyles[size]}
      className={cn(
        "rounded-lg border items-center justify-center flex-row",
        variantContainerStyles[variant],
        isDisabled && "opacity-50",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" || variant === "danger" ? "#fff" : "#475569"
          }
        />
      ) : (
        <Text
          style={sizeTextStyles[size]}
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className={cn(
            "font-semibold",
            variantTextStyles[variant],
            textClassName,
          )}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}
