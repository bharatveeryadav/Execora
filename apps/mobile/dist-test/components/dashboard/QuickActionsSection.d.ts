import React from "react";
import { Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
export type QuickActionItem = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    primary: boolean;
    route: string;
    color: string;
    params?: Record<string, unknown>;
};
type Props = {
    canToggleQuickActions: boolean;
    quickActionsExpanded: boolean;
    compactQuickActionsHeader: boolean;
    addCtaScale: Animated.Value | Animated.AnimatedInterpolation<number>;
    addCtaGlow: Animated.Value | Animated.AnimatedInterpolation<number>;
    quickActionTileWidth: number;
    contentWidth: number;
    visibleQuickActions: QuickActionItem[];
    actionPrimaryColor: string;
    onToggleExpand: () => void;
    onOpenAddTransaction: () => void;
    onQuickAction: (route: string, params?: Record<string, unknown>) => void;
};
export declare function QuickActionsSection({ canToggleQuickActions, quickActionsExpanded, compactQuickActionsHeader, addCtaScale, addCtaGlow, quickActionTileWidth, contentWidth, visibleQuickActions, actionPrimaryColor, onToggleExpand, onOpenAddTransaction, onQuickAction, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=QuickActionsSection.d.ts.map