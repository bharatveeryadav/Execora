import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../shared/lib/constants";
import { cn } from "../../lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const toneMap = {
  default: { icon: COLORS.slate[500], value: "text-slate-800" },
  primary: { icon: COLORS.primary, value: "text-primary" },
  success: { icon: COLORS.success, value: "text-green-700" },
  warning: { icon: COLORS.warning, value: "text-amber-700" },
  danger: { icon: COLORS.danger, value: "text-red-700" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: StatCardProps) {
  const palette = toneMap[tone];

  return (
    <View
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4",
        className,
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </Text>
          <Text className={cn("mt-2 text-2xl font-bold", palette.value)}>
            {value}
          </Text>
          {hint ? (
            <Text className="mt-1 text-xs text-slate-500">{hint}</Text>
          ) : null}
        </View>
        {icon ? <Ionicons name={icon} size={18} color={palette.icon} /> : null}
      </View>
    </View>
  );
}
