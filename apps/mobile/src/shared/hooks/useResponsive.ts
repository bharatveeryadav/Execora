/**
 * useResponsive — production-ready responsive layout for React Native.
 *
 * Uses useWindowDimensions (official API) which auto-updates on rotation,
 * foldables, and font scale changes.
 *
 * Breakpoints (logical px, iOS):
 *   small:  < 360  (iPhone SE)
 *   medium: 360–430 (iPhone 14/15/16)
 *   large:  ≥ 430   (Plus, Pro Max)
 *   tablet: ≥ 768  (iPad mini+)
 *
 * @see https://reactnative.dev/docs/usewindowdimensions
 */
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { getScaledFont } from "../../lib/typography";

export const BREAKPOINTS = {
  small: 360,
  large: 430,
  tablet: 768,
  maxContentWidth: 480,
} as const;

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      height,
      fontScale,

      // Scaled font sizes (respects system font scale, clamped to 1.5x max)
      scaledFont: getScaledFont(fontScale),

      // Breakpoint flags
      isSmall: width < BREAKPOINTS.small,
      isLarge: width >= BREAKPOINTS.large,
      isTablet: width >= BREAKPOINTS.tablet,

      // Content padding: 12–24px, scales with width (4% of screen, clamped)
      contentPad: Math.min(24, Math.max(12, Math.round(width * 0.04))),

      // Max content width for centered layouts (tablets)
      maxContentWidth: BREAKPOINTS.maxContentWidth,
      contentWidth: Math.min(
        width - Math.min(24, Math.max(12, Math.round(width * 0.04))) * 2,
        BREAKPOINTS.maxContentWidth,
      ),
    }),
    [width, height, fontScale],
  );
}
