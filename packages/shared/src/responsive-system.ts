/**
 * Universal Responsive Design System
 * ──────────────────────────────────
 * Centralized breakpoints, spacing, typography scales for web + mobile.
 * Define once, use everywhere.
 *
 * Usage:
 *   - Mobile: import from here → use with context/hooks
 *   - Web: import here → use with Tailwind classes + media queries
 */

/**
 * Device Classes — consistent naming across platforms
 */
export enum DeviceClass {
  /** Phones: < 360px */
  ExtraSmall = "xs",
  /** Phones: 360–390px */
  Small = "sm",
  /** Phones: 390–430px */
  Medium = "md",
  /** Phones/tablets: 430–768px */
  Large = "lg",
  /** Tablets: 768–1024px */
  Tablet = "tab",
  /** Desktops: 1024–1280px */
  Desktop = "desk",
  /** Widescreen: 1280–1920px */
  Widescreen = "wide",
  /** 4K: >= 1920px */
  Cinema = "cinema",
}

/**
 * Universal Breakpoints (in logical pixels)
 * ├─ Mobile-first: sm → lg (phone landscape max)
 * ├─ Tablet: tab (iPad portrait min)
 * └─ Desktop+: desk, wide, 4k
 *
 * Tailwind mapping:
 *   sm → Tailwind `sm: 640px` (already tablet horizontal)
 *   md → Tailwind `md: 768px`
 *   lg → Tailwind `lg: 1024px`
 *   xl → Tailwind `xl: 1280px`
 *   2xl → Tailwind `2xl: 1536px`
 */
export const BREAKPOINTS = {
  // ─ Mobile ────────────────────
  xs: 320, // iPhone SE minimum
  sm: 360, // iPhone 14
  md: 390, // iPhone 14 Pro
  lg: 430, // iPhone 14 Plus / larger phones
  // ─ Tablet ────────────────────
  tab: 768, // iPad mini portrait
  // ─ Desktop ───────────────────
  desk: 1024, // Small laptop / iPad landscape
  wide: 1280, // Standard laptop
  cinema: 1920, // 4K / widescreen
} as const;

/**
 * Responsive Layout Tokens
 * Used to compute padding, margins, max-widths based on device class
 */
export const LAYOUT = {
  // Content padding (sides): adapts to device size
  padding: {
    mobile: 12, // React Native: 12px on phones
    tablet: 16, // Tablet: 16px
    desktop: 24, // Desktop: 24px
  },

  // Max content width for centered layouts
  maxWidth: {
    mobile: 480, // Phone; forces single-column
    tablet: 720, // Tablet; narrow two-column
    desktop: 1120, // Desktop; full layout capacity
    wide: 1400, // Widescreen premium
  },

  // Gutter between columns (grid/flex layouts)
  gutter: {
    mobile: 8,
    tablet: 12,
    desktop: 16,
  },

  // Safe areas (notch / dynamic island handling)
  safeArea: {
    top: 16, // Below status bar / notch
    bottom: 16, // Above home indicator
    sides: 12,
  },
} as const;

/**
 * Universal Typography Scale
 * Scales by device, adapts to system font size
 *
 * Usage:
 *   - Mobile: use with getScaledFont(fontScale)
 *   - Web: use with Tailwind size classes
 */
export const TYPOGRAPHY = {
  // Base font sizes (mobile-first)
  fontSize: {
    micro: 10, // Badges, timestamps
    xs: 11,
    sm: 12,
    base: 14, // Body text
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
  },

  // Scaling factor per device class (multiply base by this)
  scale: {
    xs: 0.85, // Small devices: reduce slightly
    sm: 0.9,
    md: 1, // Default/medium
    lg: 1, // Large phones: same as medium
    tab: 1.05, // Tablets: slightly larger
    desk: 1.1, // Desktops: 10% larger
    wide: 1.15, // Widescreen: 15% larger
    cinema: 1.2, // 4K: 20% larger
  },

  // Line height for readability
  lineHeight: {
    tight: 1.2, // Headings
    normal: 1.5, // Body
    relaxed: 1.75, // Long-form content
  },

  // Letter spacing (tracking)
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
} as const;

/**
 * Universal Spacing Scale
 * Based on 4px grid system
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Border Radius
 * Consistent across platforms
 */
export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/**
 * Responsive Grid/Flexbox Utility
 * ──────────────────────────────────
 * Get number of columns for grid layouts per device class
 */
export const GRID = {
  columns: {
    xs: 1, // Single column on extra small
    sm: 1, // Single column
    md: 1,
    lg: 1,
    tab: 2, // Two columns on tablet portrait
    desk: 3, // Three columns on desktop
    wide: 4, // Four columns on widescreen
    cinema: 5, // Five columns on 4K
  },

  // Gap between grid items
  gap: {
    mobile: 8,
    tablet: 12,
    desktop: 16,
  },
} as const;

/**
 * Helper: Determine device class from width
 * @param widthPx Logical pixel width
 * @returns DeviceClass enum
 */
export function getDeviceClass(widthPx: number): DeviceClass {
  if (widthPx < BREAKPOINTS.sm) return DeviceClass.ExtraSmall;
  if (widthPx < BREAKPOINTS.md) return DeviceClass.Small;
  if (widthPx < BREAKPOINTS.lg) return DeviceClass.Medium;
  if (widthPx < BREAKPOINTS.tab) return DeviceClass.Large;
  if (widthPx < BREAKPOINTS.desk) return DeviceClass.Tablet;
  if (widthPx < BREAKPOINTS.wide) return DeviceClass.Desktop;
  if (widthPx < BREAKPOINTS.cinema) return DeviceClass.Widescreen;
  return DeviceClass.Cinema;
}

/**
 * Helper: Get responsive padding based on device class
 * @param deviceClass Current device class
 * @returns Padding in pixels
 */
export function getResponsivePadding(deviceClass: DeviceClass): number {
  switch (deviceClass) {
    case DeviceClass.ExtraSmall:
    case DeviceClass.Small:
    case DeviceClass.Medium:
    case DeviceClass.Large:
      return LAYOUT.padding.mobile;
    case DeviceClass.Tablet:
      return LAYOUT.padding.tablet;
    case DeviceClass.Desktop:
    case DeviceClass.Widescreen:
    case DeviceClass.Cinema:
      return LAYOUT.padding.desktop;
  }
}

/**
 * Helper: Get max content width based on device class
 * @param deviceClass Current device class
 * @returns Max width in pixels
 */
export function getMaxWidth(deviceClass: DeviceClass): number {
  switch (deviceClass) {
    case DeviceClass.ExtraSmall:
    case DeviceClass.Small:
    case DeviceClass.Medium:
    case DeviceClass.Large:
      return LAYOUT.maxWidth.mobile;
    case DeviceClass.Tablet:
      return LAYOUT.maxWidth.tablet;
    case DeviceClass.Desktop:
    case DeviceClass.Widescreen:
      return LAYOUT.maxWidth.desktop;
    case DeviceClass.Cinema:
      return LAYOUT.maxWidth.wide;
  }
}

/**
 * Helper: Get grid columns based on device class
 * @param deviceClass Current device class
 * @returns Number of columns
 */
export function getGridColumns(deviceClass: DeviceClass): number {
  switch (deviceClass) {
    case DeviceClass.ExtraSmall:
    case DeviceClass.Small:
    case DeviceClass.Medium:
    case DeviceClass.Large:
      return GRID.columns.xs;
    case DeviceClass.Tablet:
      return GRID.columns.tab;
    case DeviceClass.Desktop:
      return GRID.columns.desk;
    case DeviceClass.Widescreen:
      return GRID.columns.wide;
    case DeviceClass.Cinema:
      return GRID.columns.cinema;
  }
}

/**
 * Helper: Get typography scale factor for device
 * @param deviceClass Current device class
 * @returns Scale multiplier (e.g., 1.1 for 10% larger)
 */
export function getTypographyScale(deviceClass: DeviceClass): number {
  const scaleKey = deviceClass as unknown as keyof typeof TYPOGRAPHY.scale;
  return TYPOGRAPHY.scale[scaleKey] ?? TYPOGRAPHY.scale.md;
}

/**
 * Page Responsive Requirement Declaration
 * ──────────────────────────────────────
 * Use this to declare what your page supports.
 * Framework adapters use this to apply layout logic.
 */
export interface ResponsivePageStrategy {
  /** Is mobile-optimized? */
  supportsMobile: boolean;
  /** Is tablet-optimized? */
  supportsTablet: boolean;
  /** Is desktop-optimized? */
  supportsDesktop: boolean;
  /** Custom breakpoint for this page (optional) */
  customBreakpoint?: number;
  /** Force single-column layout even on desktop? */
  singleColumn?: boolean;
  /** Preferred grid columns per device (overrides default) */
  columnOverrides?: Partial<Record<DeviceClass, number>>;
}

/**
 * Common Strategies
 */
export const RESPONSIVE_STRATEGIES = {
  /** Mobile-only (single column everywhere) */
  mobileOnly: {
    supportsMobile: true,
    supportsTablet: false,
    supportsDesktop: false,
    singleColumn: true,
  } as ResponsivePageStrategy,

  /** Mobile + tablet (collapse to single column on mobile) */
  mobileThenTablet: {
    supportsMobile: true,
    supportsTablet: true,
    supportsDesktop: false,
    columnOverrides: {
      [DeviceClass.Tablet]: 1,
      [DeviceClass.Desktop]: 2,
    },
  } as ResponsivePageStrategy,

  /** Full responsive (mobile → tablet → desktop multi-column) */
  universalResponsive: {
    supportsMobile: true,
    supportsTablet: true,
    supportsDesktop: true,
  } as ResponsivePageStrategy,

  /** Desktop-first (optimize for desktop, scale down) */
  desktopFirst: {
    supportsMobile: true,
    supportsTablet: true,
    supportsDesktop: true,
    columnOverrides: {
      [DeviceClass.Large]: 1,
      [DeviceClass.Tablet]: 2,
      [DeviceClass.Desktop]: 3,
    },
  } as ResponsivePageStrategy,
} as const;

export default {
  DeviceClass,
  BREAKPOINTS,
  LAYOUT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  GRID,
  getDeviceClass,
  getResponsivePadding,
  getMaxWidth,
  getGridColumns,
  getTypographyScale,
  RESPONSIVE_STRATEGIES,
};
