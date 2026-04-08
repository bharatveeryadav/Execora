/**
 * Web Responsive System Adapter
 * ═════════════════════════════
 * Integration of @execora/shared/responsive-system for React + Tailwind
 *
 * Place in: apps/web/src/lib/responsive-system-adapter.ts
 */

import { useEffect, useLayoutEffect, useState } from "react";
import {
  BREAKPOINTS,
  DeviceClass,
  getDeviceClass,
  getResponsivePadding,
  getMaxWidth,
  getGridColumns,
} from "@execora/shared/responsive-system";

/** Detect SSR environment */
const useIsoEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * `useResponsiveWeb` — Production Hook for React Web
 *
 * Listens to window resize and media query changes.
 * Returns responsive device class and utility properties.
 *
 * @returns Responsive layout properties
 */
export function useResponsiveWeb() {
  const [deviceClass, setDeviceClass] = useState<DeviceClass>(() =>
    typeof window !== "undefined"
      ? getDeviceClass(window.innerWidth)
      : DeviceClass.Medium,
  );

  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1024,
  );

  useIsoEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      setDeviceClass(getDeviceClass(newWidth));
    };

    // Initial measurement
    handleResize();

    // Listen to resize
    window.addEventListener("resize", handleResize, { passive: true });

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const padding = getResponsivePadding(deviceClass);
  const maxWidth = getMaxWidth(deviceClass);
  const gridCols = getGridColumns(deviceClass);

  return {
    // Dimensions
    windowWidth,
    deviceClass,

    // Convenience flags
    isMobile: windowWidth < BREAKPOINTS.tab,
    isTablet: windowWidth >= BREAKPOINTS.tab && windowWidth < BREAKPOINTS.desk,
    isDesktop: windowWidth >= BREAKPOINTS.desk,

    // Responsive values
    padding,
    maxWidth,
    gridColumns: gridCols,

    // Tailwind class helpers
    tailwindBreakpoint:
      windowWidth < BREAKPOINTS.sm
        ? "xs"
        : windowWidth < BREAKPOINTS.md
          ? "xsm"
          : windowWidth < BREAKPOINTS.lg
            ? "xmd"
            : windowWidth < BREAKPOINTS.tab
              ? "xlg"
              : windowWidth < BREAKPOINTS.desk
                ? "tab"
                : windowWidth < BREAKPOINTS.wide
                  ? "desk"
                  : windowWidth < BREAKPOINTS.cinema
                    ? "wide"
                    : "cinema",
  };
}

/**
 * Responsive utilities for inline styles + conditional rendering
 */
export const ResponsiveUtils = {
  /**
   * Get Tailwind container classes for responsive padding
   * @example "px-3 md:px-4 lg:px-6 xl:px-8"
   */
  paddingClasses: "px-3 xsm:px-4 xmd:px-4 xlg:px-5 tab:px-6 desk:px-8",

  /**
   * Get Tailwind grid classes (responsive columns)
   * @example "grid grid-cols-1 xmd:grid-cols-2 tab:grid-cols-2 desk:grid-cols-3"
   */
  gridClasses: (
    mobileColumns: 1 | 2 | 3 | 4 | 6 | 12,
    tabletColumns: 1 | 2 | 3 | 4 | 6 | 12,
    desktopColumns: 1 | 2 | 3 | 4 | 6 | 12,
  ) =>
    `grid grid-cols-${mobileColumns} xmd:grid-cols-${tabletColumns} tab:grid-cols-${tabletColumns} desk:grid-cols-${desktopColumns}`,

  /**
   * Get spacing scale (matches SPACING constants)
   */
  spacing: {
    xs: "px-1", // 4px
    sm: "px-2", // 8px
    md: "px-3", // 12px
    lg: "px-4", // 16px
    xl: "px-6", // 24px
    xxl: "px-8", // 32px
  },

  /**
   * Media query breakpoints for custom styling
   */
  breakpoints: {
    xs: `(min-width: ${BREAKPOINTS.xs}px)`,
    sm: `(min-width: ${BREAKPOINTS.sm}px)`,
    md: `(min-width: ${BREAKPOINTS.md}px)`,
    lg: `(min-width: ${BREAKPOINTS.lg}px)`,
    tab: `(min-width: ${BREAKPOINTS.tab}px)`,
    desk: `(min-width: ${BREAKPOINTS.desk}px)`,
    wide: `(min-width: ${BREAKPOINTS.wide}px)`,
    cinema: `(min-width: ${BREAKPOINTS.cinema}px)`,
  },
};

export default useResponsiveWeb;
