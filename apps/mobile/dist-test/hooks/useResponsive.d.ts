export declare const BREAKPOINTS: {
    readonly small: 360;
    readonly large: 430;
    readonly tablet: 768;
    readonly maxContentWidth: 480;
};
export declare function useResponsive(): {
    width: number;
    height: number;
    fontScale: number;
    scaledFont: Record<"title" | "heading" | "body" | "label" | "caption" | "micro", number>;
    isSmall: boolean;
    isLarge: boolean;
    isTablet: boolean;
    contentPad: number;
    maxContentWidth: 480;
    contentWidth: number;
};
//# sourceMappingURL=useResponsive.d.ts.map