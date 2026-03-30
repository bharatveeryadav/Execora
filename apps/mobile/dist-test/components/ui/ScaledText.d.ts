/**
 * ScaledText — Text that respects system font scale with a safe cap.
 * Use for critical text where layout must not break at 200%+ font size.
 *
 * React Native Text already scales by default (allowFontScaling=true).
 * This component adds maxFontSizeMultiplier to prevent overflow.
 */
import React from "react";
import { TextProps } from "react-native";
type ScaledTextProps = TextProps;
export declare function ScaledText({ style, ...props }: ScaledTextProps): React.JSX.Element;
export {};
//# sourceMappingURL=ScaledText.d.ts.map