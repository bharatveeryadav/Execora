/**
 * EmptyState — design system component (Sprint 2).
 */
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { cn } from "../../lib/utils";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn("items-center justify-center py-12 px-6", className)}>
      <Text className="text-5xl mb-3">{icon}</Text>
      <Text className="text-lg font-semibold text-slate-800 dark:text-slate-200 text-center mb-1">
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
          className="bg-primary px-5 min-h-[44px] py-2.5 rounded-xl items-center justify-center"
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
