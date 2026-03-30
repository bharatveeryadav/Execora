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
export declare const FONT: {
    readonly title: 18;
    readonly heading: 16;
    readonly body: 14;
    readonly label: 12;
    readonly caption: 11;
    readonly micro: 10;
};
export type FontKey = keyof typeof FONT;
/**
 * Returns font sizes scaled by system fontScale, clamped to prevent layout breakage.
 * Use for StyleSheet fontSize when you need explicit control.
 */
export declare function getScaledFont(fontScale: number): Record<FontKey, number>;
/** Max multiplier for Text — cap system font scale to avoid layout issues */
export declare const MAX_FONT_SIZE_MULTIPLIER = 1.5;
/** Tailwind-compatible class names for enterprise typography */
export declare const TYPO: {
    readonly pageTitle: "text-lg font-semibold text-slate-800";
    readonly sectionTitle: "text-xs font-semibold text-slate-600 uppercase tracking-wide";
    readonly body: "text-sm font-medium text-slate-800";
    readonly bodyMuted: "text-sm text-slate-500";
    readonly label: "text-xs font-medium text-slate-500";
    readonly labelBold: "text-sm font-semibold text-slate-800";
    readonly caption: "text-xs text-slate-500";
    readonly value: "text-base font-bold text-slate-800";
    readonly valueRight: "text-base font-bold text-slate-800 text-right";
    readonly micro: "text-[11px] font-medium text-slate-500";
    readonly microBold: "text-[11px] font-bold";
};
//# sourceMappingURL=typography.d.ts.map