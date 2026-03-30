/**
 * Reusable Tab Bar component
 * Used in: DashboardScreen, InvoiceListScreen, PartiesScreen, etc.
 * Eliminates duplication of tab switching logic
 */
import React from "react";
import { Ionicons } from "@expo/vector-icons";
export interface TabItem {
    id: string;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    badge?: number;
    testID?: string;
}
export interface TabBarProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
    scrollable?: boolean;
    variant?: "default" | "pills";
    className?: string;
}
/**
 * Production-ready TabBar component
 * - Supports icons, badges, scroll on small screens
 * - Accessible with testID
 * - Keyboard-aware
 */
export declare const TabBar: React.NamedExoticComponent<TabBarProps>;
export default TabBar;
//# sourceMappingURL=TabBar.d.ts.map