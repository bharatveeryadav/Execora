/**
 * Button — design system component (Sprint 2).
 * Variants: primary, outline, ghost, danger; sizes: sm, md, lg.
 */
import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { cn } from "../../lib/utils";
import { hapticLight } from "../../lib/haptics";

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

const sizeStyles: Record<Size, string> = {
  sm: "px-3 min-h-[44px] py-2",
  md: "px-4 min-h-[44px] py-2.5",
  lg: "px-6 min-h-[48px] py-3",
};

const sizeTextStyles: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
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
      className={cn(
        "rounded-lg border items-center justify-center flex-row",
        variantContainerStyles[variant],
        sizeStyles[size],
        isDisabled && "opacity-50",
        className
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#fff" : "#475569"}
        />
      ) : (
        <Text
          className={cn(
            "font-semibold",
            variantTextStyles[variant],
            sizeTextStyles[size],
            textClassName
          )}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}
