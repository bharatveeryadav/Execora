import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { COLORS } from "../../shared/lib/constants";
import { cn } from "../../lib/utils";

export interface LoadingBlockProps {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function LoadingBlock({
  title = "Loading",
  description,
  className,
  compact = false,
}: LoadingBlockProps) {
  return (
    <View
      className={cn(
        "items-center justify-center rounded-2xl border border-slate-200 bg-white",
        compact ? "px-4 py-5" : "px-6 py-10",
        className,
      )}
    >
      <ActivityIndicator size="small" color={COLORS.primary} />
      <Text className="mt-3 text-sm font-semibold text-slate-800">{title}</Text>
      {description ? (
        <Text className="mt-1 text-center text-xs leading-5 text-slate-500">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
