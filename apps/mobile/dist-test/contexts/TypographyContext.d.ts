/**
 * TypographyContext — provides fontScale-aware typography for dynamic font sizing.
 * Respects system font size (accessibility) while capping scale to prevent layout breakage.
 */
import React from "react";
import { type FontKey } from "../lib/typography";
type TypographyContextValue = {
    fontScale: number;
    scaledFont: Record<FontKey, number>;
    maxFontSizeMultiplier: number;
};
export declare function TypographyProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useTypography(): TypographyContextValue;
export {};
//# sourceMappingURL=TypographyContext.d.ts.map