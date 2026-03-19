/**
 * ScaledText — Text that respects system font scale with a safe cap.
 * Use for critical text where layout must not break at 200%+ font size.
 *
 * React Native Text already scales by default (allowFontScaling=true).
 * This component adds maxFontSizeMultiplier to prevent overflow.
 */
import React from "react";
import { Text, TextProps } from "react-native";
import { useTypography } from "../../contexts/TypographyContext";

type ScaledTextProps = TextProps;

export function ScaledText({ style, ...props }: ScaledTextProps) {
  const { maxFontSizeMultiplier } = useTypography();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={style}
      {...props}
    />
  );
}
