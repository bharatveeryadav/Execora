/**
 * TypographyContext — provides fontScale-aware typography for dynamic font sizing.
 * Respects system font size (accessibility) while capping scale to prevent layout breakage.
 */
import React, { createContext, useContext, useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { getScaledFont, MAX_FONT_SIZE_MULTIPLIER, type FontKey } from "../lib/typography";

type TypographyContextValue = {
  fontScale: number;
  scaledFont: Record<FontKey, number>;
  maxFontSizeMultiplier: number;
};

const TypographyContext = createContext<TypographyContextValue | null>(null);

export function TypographyProvider({ children }: { children: React.ReactNode }) {
  const { fontScale } = useWindowDimensions();
  const value = useMemo(
    () => ({
      fontScale,
      scaledFont: getScaledFont(fontScale),
      maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
    }),
    [fontScale]
  );
  return (
    <TypographyContext.Provider value={value}>
      {children}
    </TypographyContext.Provider>
  );
}

export function useTypography() {
  const ctx = useContext(TypographyContext);
  if (!ctx) {
    // Fallback when used outside provider (e.g. tests)
    const fontScale = 1;
    return {
      fontScale,
      scaledFont: getScaledFont(fontScale),
      maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
    };
  }
  return ctx;
}
