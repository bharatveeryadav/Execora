/**
 * Responsive layout utilities for React Native.
 *
 * Per reactnative.dev/docs/height-and-width:
 * - Use flex for dynamic sizing
 * - useWindowDimensions for screen-size-dependent layouts
 * - Percentage dimensions require parent with defined size
 */
import { useWindowDimensions } from "react-native";
import { useMemo } from "react";

/** Breakpoints (width) — approximate device categories */
const BREAKPOINTS = {
  sm: 360,
  md: 400,
  lg: 480,
  xl: 600,
} as const;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      height,
      isSmall: width < BREAKPOINTS.sm,
      isMedium: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
      isLarge: width >= BREAKPOINTS.md,
      /** Padding for content — scales with screen */
      contentPadding: Math.min(24, Math.max(16, width * 0.04)),
      /** Card/list padding */
      cardPadding: Math.min(16, Math.max(12, width * 0.03)),
    }),
    [width, height]
  );
}
