/**
 * Mobile Responsive System Adapter
 * ════════════════════════════════
 * Updated integration of @execora/shared/responsive-system for React Native
 *
 * This replaces the existing apps/mobile/src/shared/hooks/useResponsive.ts
 * with a system that uses centralized breakpoints and device classes
 */

import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import {
  BREAKPOINTS,
  DeviceClass,
  getDeviceClass,
  getResponsivePadding,
  getMaxWidth,
  getGridColumns,
  getTypographyScale,
  LAYOUT,
} from "@execora/shared";
import { getScaledFont } from "../../lib/typography";

/**
 * `useResponsiveMobile` — Production Hook for React Native
 *
 * Returns all responsive information in a single memoized object.
 * Component subscribes to window dimension changes via React Native's API.
 *
 * @returns Responsive layout properties
 */
export function useResponsiveMobile() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(
    () => {
      const deviceClass = getDeviceClass(width);
      const padding = getResponsivePadding(deviceClass);
      const maxWidth = getMaxWidth(deviceClass);
      const gridCols = getGridColumns(deviceClass);
      const typographyScale = getTypographyScale(deviceClass);

      // Computed content width (account for side padding)
      const contentWidth = Math.min(
        width - padding * 2,
        maxWidth,
      );

      return {
        // Raw dimensions
        width,
        height,
        fontScale,

        // Device classification
        deviceClass,
        deviceName: `${width}w×${height}h`,

        // Breakpoint flags (backward compat + convenience)
        isSmall: width < BREAKPOINTS.sm,
        isLarge: width >= BREAKPOINTS.lg,
        isTablet: width >= BREAKPOINTS.tab,

        // Responsive spacing / layout
        padding, // Side padding (px), determined by device
        paddingVertical: LAYOUT.safeArea.top,
        paddingBottom: LAYOUT.safeArea.bottom,

        // Content sizing
        maxWidth,
        contentWidth,
        contentPad: padding,

        // Typography scaling
        scaledFont: getScaledFont(fontScale),
        typographyScale,

        // Grid / multi-column layouts
        gridColumns: gridCols,
        gridGap: LAYOUT.gutter[
          deviceClass === DeviceClass.ExtraSmall || deviceClass === DeviceClass.Small
            ? "mobile"
            : deviceClass === DeviceClass.Tablet
              ? "tablet"
              : "desktop"
        ],

        // Debugging
        __debug: {
          breakpoints: BREAKPOINTS,
          deviceClass,
          calculatedMs: Date.now(),
        },
      };
    },
    [width, height, fontScale],
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Backward-Compatibility Export
// ────────────────────────────────────────────────────────────────────────────

// Existing code imports `useResponsive` from @/shared/hooks/useResponsive
// This file REPLACES that export, so no breaking changes in screen imports
export const useResponsive = useResponsiveMobile;

export default useResponsiveMobile;
