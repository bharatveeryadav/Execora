/**
 * ErrorCard — error state with retry (Sprint 19).
 */
import React from "react";
export interface ErrorCardProps {
    message?: string;
    onRetry?: () => void;
    className?: string;
}
export declare function ErrorCard({ message, onRetry, className, }: ErrorCardProps): React.JSX.Element;
//# sourceMappingURL=ErrorCard.d.ts.map