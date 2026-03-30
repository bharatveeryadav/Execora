import React from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/utils";
import { useResponsive } from "../../hooks/useResponsive";

export interface ScreenInnerProps extends ViewProps {
  fluid?: boolean;
}

// Centralized responsive content frame used by screens.
export function ScreenInner({
  children,
  className,
  style,
  fluid = false,
  ...props
}: ScreenInnerProps) {
  const { contentWidth } = useResponsive();
  return (
    <View
      className={cn("w-full self-center", className)}
      style={[{ width: "100%", maxWidth: fluid ? undefined : contentWidth }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
