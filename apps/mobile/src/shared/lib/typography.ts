/**
 * Enterprise typography scale — consistent font sizes and alignment.
 * Use across all screens for professional, readable UI.
 *
 * Scale:
 *   title     — 18px, page/screen title
 *   heading   — 16px, section heading
 *   body      — 14px, primary content
 *   label     — 12px, labels, secondary text
 *   caption   — 11px, hints, metadata
 *   micro     — 10px, badges, compact labels
 *
 * Dynamic scaling: use getScaledFont(fontScale) for accessibility.
 * React Native Text scales by default (allowFontScaling=true); use
 * maxFontSizeMultiplier to cap scale and prevent layout breakage.
 */
export const FONT = {
  title: 18,
  heading: 16,
  body: 14,
  label: 12,
  caption: 11,
  micro: 10,
} as const;

export type FontKey = keyof typeof FONT;

/** Max font scale multiplier — prevents layout breaking at 200%+ system font */
const MAX_FONT_SCALE = 1.5;

/**
 * Returns font sizes scaled by system fontScale, clamped to prevent layout breakage.
 * Use for StyleSheet fontSize when you need explicit control.
 */
export function getScaledFont(fontScale: number): Record<FontKey, number> {
  const scale = Math.min(fontScale, MAX_FONT_SCALE);
  return {
    title: Math.round(FONT.title * scale),
    heading: Math.round(FONT.heading * scale),
    body: Math.round(FONT.body * scale),
    label: Math.round(FONT.label * scale),
    caption: Math.round(FONT.caption * scale),
    micro: Math.round(FONT.micro * scale),
  };
}

/** Max multiplier for Text — cap system font scale to avoid layout issues */
export const MAX_FONT_SIZE_MULTIPLIER = MAX_FONT_SCALE;

/** Tailwind-compatible class names for enterprise typography */
export const TYPO = {
  pageTitle: "text-lg font-semibold text-slate-800",
  sectionTitle: "text-xs font-semibold text-slate-600 uppercase tracking-wide",
  body: "text-sm font-medium text-slate-800",
  bodyMuted: "text-sm text-slate-500",
  label: "text-xs font-medium text-slate-500",
  labelBold: "text-sm font-semibold text-slate-800",
  caption: "text-xs text-slate-500",
  value: "text-base font-bold text-slate-800",
  valueRight: "text-base font-bold text-slate-800 text-right",
  micro: "text-[11px] font-medium text-slate-500",
  microBold: "text-[11px] font-bold",
} as const;
