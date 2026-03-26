/**
 * Reusable Filter Bar component
 * Used in: InvoiceListScreen, PartiesScreen, ReportsScreen
 * Eliminates duplication of filter UI and state management
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
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
export const FilterBar = React.memo(function FilterBar({
  options,
  activeFilters,
  onFilterChange,
  onClearAll,
  variant = "chips",
  isOpen = false,
  onOpenChange,
  maxVisible = 2,
  className = "",
}: FilterBarProps) {
  const handleFilterPress = useCallback(
    (optionId: string) => {
      const isActive = activeFilters.some((f) => f.id === optionId);
      if (isActive) {
        // Remove if already active
        onFilterChange(optionId, optionId);
      } else {
        // Add new filter
        onFilterChange(optionId);
      }
    },
    [activeFilters, onFilterChange],
  );

  const visibleFilters = useMemo(
    () => options.slice(0, maxVisible),
    [options, maxVisible],
  );

  const hiddenOptionsCount = Math.max(0, options.length - maxVisible);

  // Render based on variant
  if (variant === "chips") {
    return (
      <View className={`flex-row flex-wrap gap-2 mb-3 ${className}`}>
        {visibleFilters.map((option) => {
          const isActive = activeFilters.some((f) => f.id === option.id);
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleFilterPress(option.id)}
              className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 border ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-slate-200 bg-white"
              }`}
            >
              {option.icon && (
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={isActive ? "#e67e22" : "#64748b"}
                />
              )}
              <Text
                className={`text-xs font-semibold ${
                  isActive ? "text-primary" : "text-slate-600"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {hiddenOptionsCount > 0 && (
          <TouchableOpacity
            onPress={() => onOpenChange?.(!isOpen)}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 border border-slate-200 bg-white"
          >
            <Ionicons name="filter" size={16} color="#64748b" />
            <Text className="text-xs font-semibold text-slate-600">
              +{hiddenOptionsCount} more
            </Text>
          </TouchableOpacity>
        )}

        {activeFilters.length > 0 && (
          <TouchableOpacity
            onPress={onClearAll}
            className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
          >
            <Text className="text-xs font-semibold text-red-500">
              Clear all
            </Text>
            <Ionicons name="close-circle" size={14} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (variant === "dropdown") {
    return (
      <View className={className}>
        <TouchableOpacity
          onPress={() => onOpenChange?.(!isOpen)}
          className="flex-row items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg bg-white"
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="filter" size={18} color="#64748b" />
            <Text className="text-sm font-semibold text-slate-700">
              {activeFilters.length > 0 ? activeFilters[0].label : "Filters"}
            </Text>
            {activeFilters.length > 1 && (
              <View className="bg-primary rounded-full px-2 py-0.5">
                <Text className="text-white text-xs font-bold">
                  +{activeFilters.length - 1}
                </Text>
              </View>
            )}
          </View>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748b"
          />
        </TouchableOpacity>

        {isOpen && (
          <View className="absolute top-12 left-0 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg">
            {options.map((option) => {
              const isActive = activeFilters.some((f) => f.id === option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handleFilterPress(option.id)}
                  className={`flex-row items-center px-3 py-2.5 border-b border-slate-100 last:border-0 ${
                    isActive ? "bg-primary/5" : ""
                  }`}
                >
                  <View
                    className={`w-4 h-4 rounded border-2 mr-3 ${
                      isActive
                        ? "border-primary bg-primary"
                        : "border-slate-300"
                    }`}
                  />
                  <Text
                    className={`flex-1 text-sm font-medium ${
                      isActive ? "text-primary" : "text-slate-700"
                    }`}
                  >
                    {option.label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={16} color="#e67e22" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  // Modal variant
  return (
    <>
      <TouchableOpacity
        onPress={() => onOpenChange?.(!isOpen)}
        className={`flex-row items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg bg-white ${className}`}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="filter" size={18} color="#64748b" />
          <Text className="text-sm font-semibold text-slate-700">Filters</Text>
          {activeFilters.length > 0 && (
            <View className="bg-primary rounded-full px-2 py-0.5">
              <Text className="text-white text-xs font-bold">
                {activeFilters.length}
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="settings" size={18} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => onOpenChange?.(false)}
        />

        <View className="bg-white rounded-t-3xl px-5 py-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-800">Filters</Text>
            <TouchableOpacity onPress={() => onOpenChange?.(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
            {options.map((option) => {
              const isActive = activeFilters.some((f) => f.id === option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => handleFilterPress(option.id)}
                  className={`flex-row items-center px-3 py-3 rounded-lg mb-2 ${
                    isActive ? "bg-primary/10" : "bg-slate-50"
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded border-2 mr-3 ${
                      isActive
                        ? "border-primary bg-primary"
                        : "border-slate-300"
                    }`}
                  />
                  {option.icon && (
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={isActive ? "#e67e22" : "#64748b"}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text
                    className={`flex-1 text-sm font-medium ${
                      isActive ? "text-primary" : "text-slate-700"
                    }`}
                  >
                    {option.label}
                  </Text>
                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#e67e22"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="flex-row gap-3 mt-4 pt-3 border-t border-slate-200">
            <TouchableOpacity
              onPress={onClearAll}
              className="flex-1 py-3 border border-slate-200 rounded-lg items-center"
            >
              <Text className="text-sm font-semibold text-slate-600">
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onOpenChange?.(false)}
              className="flex-1 py-3 bg-primary rounded-lg items-center"
            >
              <Text className="text-sm font-semibold text-white">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
});

export default FilterBar;
