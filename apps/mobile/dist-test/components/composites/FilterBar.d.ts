/**
 * Reusable Filter Bar component
 * Used in: InvoiceListScreen, PartiesScreen, ReportsScreen
 * Eliminates duplication of filter UI and state management
 */
import React from "react";
import { Ionicons } from "@expo/vector-icons";
export interface FilterOption {
    id: string;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
}
export interface FilterBadge {
    label: string;
    count?: number;
    onClear: () => void;
}
export interface FilterBarProps {
    options: FilterOption[];
    activeFilters: {
        id: string;
        label: string;
    }[];
    onFilterChange: (toAdd: string, toRemove?: string) => void;
    onClearAll: () => void;
    variant?: "chips" | "dropdown" | "modal";
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    maxVisible?: number;
    className?: string;
}
/**
 * FilterBar component
 * - Multiple filter options (chips, dropdown, modal)
 * - Badge display for active filters
 * - Accessible and responsive
 */
export declare const FilterBar: React.NamedExoticComponent<FilterBarProps>;
export default FilterBar;
//# sourceMappingURL=FilterBar.d.ts.map