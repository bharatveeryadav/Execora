import React from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "../../lib/utils";
import { useResponsive } from "../../hooks/useResponsive";

export interface ScreenFrameProps extends ViewProps {
  fluid?: boolean;
}

export interface ScreenInnerProps extends ViewProps {
  fluid?: boolean;
}

// App-level frame: keeps all screens centered and width-controlled from one place.
export function ScreenFrame({
  children,
  className,
  style,
  fluid = false,
  ...props
}: ScreenFrameProps) {
  const { maxContentWidth } = useResponsive();

  return (
    <View
      className={cn("flex-1 w-full items-center", className)}
      style={[{ flex: 1, width: "100%" }, style]}
      {...props}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: fluid ? undefined : maxContentWidth,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// Content-level frame used inside screens for centered inner layouts.
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
      style={[
        {
          width: "100%",
          maxWidth: fluid ? undefined : contentWidth,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
