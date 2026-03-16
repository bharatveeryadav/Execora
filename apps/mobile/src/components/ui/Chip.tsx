/**
 * Chip — selectable filter chip (Sprint 2).
 */
import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { cn } from "../../lib/utils";

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
      className={cn(
        "px-4 min-h-[44px] py-2 rounded-lg items-center justify-center",
        selected ? "bg-primary" : "bg-slate-100",
        className
      )}
    >
      <Text
        className={cn(
          "text-sm font-semibold",
          selected ? "text-white" : "text-slate-600"
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
