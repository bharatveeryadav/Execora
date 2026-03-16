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
 */
export const FONT = {
  title: 18,
  heading: 16,
  body: 14,
  label: 12,
  caption: 11,
  micro: 10,
} as const;

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
