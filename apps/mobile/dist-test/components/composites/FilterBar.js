"use strict";
/**
 * Reusable Filter Bar component
 * Used in: InvoiceListScreen, PartiesScreen, ReportsScreen
 * Eliminates duplication of filter UI and state management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterBar = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
/**
 * FilterBar component
 * - Multiple filter options (chips, dropdown, modal)
 * - Badge display for active filters
 * - Accessible and responsive
 */
exports.FilterBar = react_1.default.memo(function FilterBar({ options, activeFilters, onFilterChange, onClearAll, variant = "chips", isOpen = false, onOpenChange, maxVisible = 2, className = "", }) {
    const handleFilterPress = (0, react_1.useCallback)((optionId) => {
        const isActive = activeFilters.some((f) => f.id === optionId);
        if (isActive) {
            // Remove if already active
            onFilterChange(optionId, optionId);
        }
        else {
            // Add new filter
            onFilterChange(optionId);
        }
    }, [activeFilters, onFilterChange]);
    const visibleFilters = (0, react_1.useMemo)(() => options.slice(0, maxVisible), [options, maxVisible]);
    const hiddenOptionsCount = Math.max(0, options.length - maxVisible);
    // Render based on variant
    if (variant === "chips") {
        return (react_1.default.createElement(react_native_1.View, { className: `flex-row flex-wrap gap-2 mb-3 ${className}` },
            visibleFilters.map((option) => {
                const isActive = activeFilters.some((f) => f.id === option.id);
                return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: option.id, onPress: () => handleFilterPress(option.id), className: `flex-row items-center gap-1.5 rounded-full px-3 py-1.5 border ${isActive
                        ? "border-primary bg-primary/10"
                        : "border-slate-200 bg-white"}` },
                    option.icon && (react_1.default.createElement(vector_icons_1.Ionicons, { name: option.icon, size: 16, color: isActive ? "#e67e22" : "#64748b" })),
                    react_1.default.createElement(react_native_1.Text, { className: `text-xs font-semibold ${isActive ? "text-primary" : "text-slate-600"}` }, option.label)));
            }),
            hiddenOptionsCount > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => onOpenChange?.(!isOpen), className: "flex-row items-center gap-1.5 rounded-full px-3 py-1.5 border border-slate-200 bg-white" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "filter", size: 16, color: "#64748b" }),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-600" },
                    "+",
                    hiddenOptionsCount,
                    " more"))),
            activeFilters.length > 0 && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onClearAll, className: "flex-row items-center gap-1 rounded-full px-3 py-1.5" },
                react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-red-500" }, "Clear all"),
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "close-circle", size: 14, color: "#ef4444" })))));
    }
    if (variant === "dropdown") {
        return (react_1.default.createElement(react_native_1.View, { className: className },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => onOpenChange?.(!isOpen), className: "flex-row items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg bg-white" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "filter", size: 18, color: "#64748b" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700" }, activeFilters.length > 0 ? activeFilters[0].label : "Filters"),
                    activeFilters.length > 1 && (react_1.default.createElement(react_native_1.View, { className: "bg-primary rounded-full px-2 py-0.5" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-white text-xs font-bold" },
                            "+",
                            activeFilters.length - 1)))),
                react_1.default.createElement(vector_icons_1.Ionicons, { name: isOpen ? "chevron-up" : "chevron-down", size: 20, color: "#64748b" })),
            isOpen && (react_1.default.createElement(react_native_1.View, { className: "absolute top-12 left-0 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg" }, options.map((option) => {
                const isActive = activeFilters.some((f) => f.id === option.id);
                return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: option.id, onPress: () => handleFilterPress(option.id), className: `flex-row items-center px-3 py-2.5 border-b border-slate-100 last:border-0 ${isActive ? "bg-primary/5" : ""}` },
                    react_1.default.createElement(react_native_1.View, { className: `w-4 h-4 rounded border-2 mr-3 ${isActive
                            ? "border-primary bg-primary"
                            : "border-slate-300"}` }),
                    react_1.default.createElement(react_native_1.Text, { className: `flex-1 text-sm font-medium ${isActive ? "text-primary" : "text-slate-700"}` }, option.label),
                    isActive && (react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark", size: 16, color: "#e67e22" }))));
            })))));
    }
    // Modal variant
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => onOpenChange?.(!isOpen), className: `flex-row items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg bg-white ${className}` },
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "filter", size: 18, color: "#64748b" }),
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700" }, "Filters"),
                activeFilters.length > 0 && (react_1.default.createElement(react_native_1.View, { className: "bg-primary rounded-full px-2 py-0.5" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-white text-xs font-bold" }, activeFilters.length)))),
            react_1.default.createElement(vector_icons_1.Ionicons, { name: "settings", size: 18, color: "#64748b" })),
        react_1.default.createElement(react_native_1.Modal, { visible: isOpen, transparent: true, animationType: "fade" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/40", onPress: () => onOpenChange?.(false) }),
            react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl px-5 py-5" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-4" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" }, "Filters"),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => onOpenChange?.(false) },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 24, color: "#64748b" }))),
                react_1.default.createElement(react_native_1.ScrollView, { showsVerticalScrollIndicator: false, className: "max-h-96" }, options.map((option) => {
                    const isActive = activeFilters.some((f) => f.id === option.id);
                    return (react_1.default.createElement(react_native_1.TouchableOpacity, { key: option.id, onPress: () => handleFilterPress(option.id), className: `flex-row items-center px-3 py-3 rounded-lg mb-2 ${isActive ? "bg-primary/10" : "bg-slate-50"}` },
                        react_1.default.createElement(react_native_1.View, { className: `w-5 h-5 rounded border-2 mr-3 ${isActive
                                ? "border-primary bg-primary"
                                : "border-slate-300"}` }),
                        option.icon && (react_1.default.createElement(vector_icons_1.Ionicons, { name: option.icon, size: 18, color: isActive ? "#e67e22" : "#64748b", style: { marginRight: 8 } })),
                        react_1.default.createElement(react_native_1.Text, { className: `flex-1 text-sm font-medium ${isActive ? "text-primary" : "text-slate-700"}` }, option.label),
                        isActive && (react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark-circle", size: 20, color: "#e67e22" }))));
                })),
                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3 mt-4 pt-3 border-t border-slate-200" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onClearAll, className: "flex-1 py-3 border border-slate-200 rounded-lg items-center" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-600" }, "Clear")),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => onOpenChange?.(false), className: "flex-1 py-3 bg-primary rounded-lg items-center" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-white" }, "Apply")))))));
});
exports.default = exports.FilterBar;
//# sourceMappingURL=FilterBar.js.map