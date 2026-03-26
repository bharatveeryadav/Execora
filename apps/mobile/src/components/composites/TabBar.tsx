/**
 * Reusable Tab Bar component
 * Used in: DashboardScreen, InvoiceListScreen, PartiesScreen, etc.
 * Eliminates duplication of tab switching logic
 */

import React, { useCallback } from "react";
import { View, TouchableOpacity, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SIZES } from "../../lib/constants";
import { MAX_FONT_SIZE_MULTIPLIER } from "../../lib/typography";

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
export const TabBar = React.memo(function TabBar({
  tabs,
  activeTab,
  onChange,
  scrollable = false,
  variant = "default",
  className = "",
}: TabBarProps) {
  const handleTabPress = useCallback(
    (tabId: string) => {
      onChange(tabId);
    },
    [onChange],
  );

  const tabContent = (
    <View className="flex-row gap-0.5">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const baseStyle =
          variant === "pills"
            ? "rounded-full min-h-[44px] px-4 border border-slate-200"
            : `${scrollable ? "" : "flex-1 "}min-h-[44px] px-3 border-b-2`;

        return (
          <TouchableOpacity
            key={tab.id}
            testID={tab.testID}
            onPress={() => handleTabPress(tab.id)}
            activeOpacity={0.7}
            className={`${baseStyle} ${
              isActive
                ? variant === "pills"
                  ? "border-primary bg-primary"
                  : "border-primary"
                : "border-slate-200"
            } items-center justify-center flex-row gap-2`}
          >
            {tab.icon && (
              <Ionicons
                name={tab.icon}
                size={18}
                color={
                  isActive
                    ? variant === "pills"
                      ? "#fff"
                      : "#e67e22"
                    : "#64748b"
                }
              />
            )}
            <Text
              style={{ fontSize: SIZES.FONT.base }}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className={`text-sm font-semibold ${
                isActive
                  ? variant === "pills"
                    ? "text-white"
                    : "text-primary"
                  : "text-slate-600"
              }`}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {tab.badge !== undefined && tab.badge > 0 && (
              <View className="bg-red-500 rounded-full px-1.5 py-0.5 ml-1">
                <Text
                  style={{ fontSize: SIZES.FONT.xs }}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  className="text-white font-bold"
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return scrollable ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={`flex-row ${className}`}
    >
      {tabContent}
    </ScrollView>
  ) : (
    <View className={`flex-row ${className}`}>{tabContent}</View>
  );
});

export default TabBar;
