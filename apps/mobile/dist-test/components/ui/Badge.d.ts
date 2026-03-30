/**
 * Badge — design system component (Sprint 2).
 * Variants: success, warning, danger, info, muted.
 */
import React from "react";
type Variant = "success" | "warning" | "danger" | "info" | "muted";
export interface BadgeProps {
    variant?: Variant;
    children: React.ReactNode;
    className?: string;
}
export declare function Badge({ variant, children, className, }: BadgeProps): React.JSX.Element;
export {};
//# sourceMappingURL=Badge.d.ts.map