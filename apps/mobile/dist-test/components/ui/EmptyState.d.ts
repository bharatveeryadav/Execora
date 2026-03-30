/**
 * EmptyState — design system component (Sprint 2).
 * Supports emoji (icon) or Ionicons (iconName).
 */
import React from "react";
import { Ionicons } from "@expo/vector-icons";
export interface EmptyStateProps {
    /** Emoji fallback when iconName not provided */
    icon?: string;
    /** Ionicons name for modern icon (takes precedence over icon) */
    iconName?: keyof typeof Ionicons.glyphMap;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}
export declare function EmptyState({ icon, iconName, title, description, actionLabel, onAction, className, }: EmptyStateProps): React.JSX.Element;
//# sourceMappingURL=EmptyState.d.ts.map