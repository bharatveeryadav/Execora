/**
 * Button — design system component (Sprint 2).
 * Variants: primary, outline, ghost, danger; sizes: sm, md, lg.
 */
import React from "react";
type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
export interface ButtonProps {
    variant?: Variant;
    size?: Size;
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    children: React.ReactNode;
    className?: string;
    textClassName?: string;
}
export declare function Button({ variant, size, onPress, disabled, loading, children, className, textClassName, }: ButtonProps): React.JSX.Element;
export {};
//# sourceMappingURL=Button.d.ts.map