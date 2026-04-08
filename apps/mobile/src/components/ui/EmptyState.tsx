/**
 * EmptyState — design system component (Sprint 2).
 * Supports emoji (icon) or Ionicons (iconName).
 */
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../../lib/utils";
import { COLORS } from "../../shared/lib/constants";

export interface EmptyStateProps {
  /** Emoji fallback when iconName not provided */
  icon?: string;
  /** Ionicons name for modern icon (takes precedence over icon) */
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = "📭",
  iconName,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn("items-center justify-center py-12 px-6", className)}>
      {iconName ? (
        <View className="mb-3">
          <Ionicons name={iconName} size={48} color={COLORS.slate[400]} />
        </View>
      ) : (
        <Text className="text-5xl mb-3">{icon}</Text>
      )}
      <Text className="text-lg font-semibold text-slate-800 dark:text-slate-200 text-center mb-1">
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="bg-primary px-5 min-h-[44px] py-2.5 rounded-xl items-center justify-center"
          style={({ pressed }) => (pressed ? { opacity: 0.75 } : null)}
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
