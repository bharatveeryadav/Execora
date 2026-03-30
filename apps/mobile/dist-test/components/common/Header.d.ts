/**
 * Header — back button + title + right slot (Sprint 2).
 */
import React from "react";
export interface HeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    rightSlot?: React.ReactNode;
    className?: string;
}
export declare function Header({ title, subtitle, showBack, rightSlot, className, }: HeaderProps): React.JSX.Element;
//# sourceMappingURL=Header.d.ts.map