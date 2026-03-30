/**
 * Card — design system component (Sprint 2).
 */
import React from "react";
import { View, TouchableOpacity, ViewProps } from "react-native";
import { cn } from "../../lib/utils";

export function Card({
  children,
  className,
  style,
  ...props
}: ViewProps & { children: React.ReactNode }) {
  return (
    <View
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-4",
        className
      )}
      style={[
        {
          shadowColor: "#0f172a",
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 1,
        },
        style,
      ]}
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
  style,
  ...props
}: ViewProps & { children: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-4",
        className
      )}
      style={[
        {
          shadowColor: "#0f172a",
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 1,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}
