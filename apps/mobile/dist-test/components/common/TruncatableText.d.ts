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
import { type TextProps } from "react-native";
type TruncatableTextProps = TextProps & {
    numberOfLines?: number;
    ellipsizeMode?: "head" | "middle" | "tail" | "clip";
    children: React.ReactNode;
};
export declare function TruncatableText({ numberOfLines, ellipsizeMode, style, children, ...rest }: TruncatableTextProps): React.JSX.Element;
export {};
//# sourceMappingURL=TruncatableText.d.ts.map