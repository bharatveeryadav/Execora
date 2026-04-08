/**
 * Card — design system component (Sprint 2).
 */
import React from "react";
import { View, Pressable, ViewProps } from "react-native";
import { cn } from "../../lib/utils";
import { COLORS } from "../../shared/lib/constants";

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
          shadowColor: COLORS.text.primary,
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
    <Pressable
      onPress={onPress}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-4",
        className
      )}
      style={({ pressed }) => [
        {
          shadowColor: COLORS.text.primary,
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 8,
          elevation: 1,
        },
        pressed ? { opacity: 0.8 } : null,
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}
