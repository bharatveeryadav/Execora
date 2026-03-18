/**
 * TruncatableText — Prevents text overflow across all devices.
 *
 * React Native best practices (reactnative.dev):
 * - numberOfLines + ellipsizeMode truncates long text
 * - flexShrink: 1 allows Text to shrink in flex layouts
 * - Parent must have minWidth: 0 (min-w-0) for flex shrink to work
 *
 * Usage: Wrap in a View with min-w-0 flex-1 for row layouts:
 *   <View className="flex-1 min-w-0">
 *     <TruncatableText numberOfLines={1}>{name}</TruncatableText>
 *   </View>
 */
import React from "react";
import { Text, type TextProps, StyleSheet } from "react-native";

type TruncatableTextProps = TextProps & {
  numberOfLines?: number;
  ellipsizeMode?: "head" | "middle" | "tail" | "clip";
  children: React.ReactNode;
};

export function TruncatableText({
  numberOfLines = 1,
  ellipsizeMode = "tail",
  style,
  children,
  ...rest
}: TruncatableTextProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      style={[styles.base, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 1,
  },
});
