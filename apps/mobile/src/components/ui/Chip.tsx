/**
 * Chip — selectable filter chip (Sprint 2).
 */
import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { cn } from "../../lib/utils";
import { SIZES } from "../../lib/constants";
import { MAX_FONT_SIZE_MULTIPLIER } from "../../lib/typography";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export function Chip({ label, selected, onPress, className }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        minHeight: SIZES.TOUCH_MIN,
        paddingHorizontal: SIZES.SPACING.lg,
        paddingVertical: SIZES.SPACING.sm,
      }}
      className={cn(
        "rounded-lg items-center justify-center",
        selected ? "bg-primary" : "bg-slate-100",
        className,
      )}
    >
      <Text
        style={{ fontSize: SIZES.FONT.base }}
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        className={cn(
          "font-semibold",
          selected ? "text-white" : "text-slate-600",
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
