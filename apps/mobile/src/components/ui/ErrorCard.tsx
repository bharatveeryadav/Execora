/**
 * ErrorCard — error state with retry (Sprint 19).
 */
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../../lib/utils";
import { COLORS } from "../../shared/lib/constants";

export interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorCard({
  message = "Something went wrong",
  onRetry,
  className,
}: ErrorCardProps) {
  return (
    <View
      className={cn(
        "rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-4 items-center",
        className
      )}
    >
      <Ionicons name="alert-circle" size={32} color={COLORS.danger} />
      <Text className="text-slate-800 dark:text-slate-200 font-medium mt-2 text-center">
        {message}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="mt-3 bg-primary min-h-[44px] min-w-[120px] px-4 py-2.5 rounded-xl items-center justify-center"
          style={({ pressed }) => (pressed ? { opacity: 0.75 } : null)}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
