import React from "react";
import { Text, View } from "react-native";
import { cn } from "../../lib/utils";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <View
      className={cn(
        "mb-3 flex-row items-center justify-between gap-3",
        className,
      )}
    >
      <View className="flex-1">
        <Text className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-xs text-slate-500">{subtitle}</Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}
