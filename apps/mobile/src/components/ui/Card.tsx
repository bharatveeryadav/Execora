/**
 * Card — design system component (Sprint 2).
 */
import React from "react";
import { View, TouchableOpacity, ViewProps } from "react-native";
import { cn } from "../../lib/utils";

export function Card({
  children,
  className,
  ...props
}: ViewProps & { children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "rounded-xl border border-slate-200 bg-card p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

export function PressableCard({
  children,
  onPress,
  className,
  ...props
}: ViewProps & { children: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={cn(
        "rounded-xl border border-slate-200 bg-card p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}
