import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TYPO } from "../../lib/typography";
import { SIZES } from "../../lib/constants";
import { MAX_FONT_SIZE_MULTIPLIER } from "../../lib/typography";

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

export function QuickActionsSection({
  canToggleQuickActions,
  quickActionsExpanded,
  compactQuickActionsHeader,
  addCtaScale,
  addCtaGlow,
  quickActionTileWidth,
  contentWidth,
  visibleQuickActions,
  actionPrimaryColor,
  onToggleExpand,
  onOpenAddTransaction,
  onQuickAction,
}: Props) {
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Text className={TYPO.sectionTitle} style={{ flexShrink: 1 }}>
          Quick Actions
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {canToggleQuickActions && (
            <TouchableOpacity
              onPress={onToggleExpand}
              activeOpacity={0.8}
              style={{ minHeight: SIZES.TOUCH_MIN }}
              className="flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1"
            >
              <Text
                style={{ fontSize: SIZES.FONT.sm }}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                className="text-xs font-semibold text-slate-600"
                numberOfLines={1}
              >
                {quickActionsExpanded
                  ? compactQuickActionsHeader
                    ? "Less"
                    : "Hide"
                  : compactQuickActionsHeader
                    ? "More"
                    : "Show all"}
              </Text>
              <Ionicons
                name={quickActionsExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color="#64748b"
              />
            </TouchableOpacity>
          )}
          <Animated.View style={{ transform: [{ scale: addCtaScale }] }}>
            <TouchableOpacity
              onPress={onOpenAddTransaction}
              activeOpacity={0.85}
              className="flex-row items-center gap-1 rounded-full border border-primary/35 bg-primary/15 px-2.5 py-1"
              style={{
                minHeight: SIZES.TOUCH_MIN,
                shadowColor: actionPrimaryColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Animated.View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: actionPrimaryColor,
                  opacity: addCtaGlow,
                }}
              >
                <Ionicons name="add" size={12} color="#fff" />
              </Animated.View>
              <Text
                style={{ fontSize: SIZES.FONT.sm }}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                className="text-xs font-semibold text-primary"
                numberOfLines={1}
              >
                {compactQuickActionsHeader ? "Add" : "Add Transaction"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {visibleQuickActions.map((qa) => (
            <TouchableOpacity
              key={qa.label}
              onPress={() => onQuickAction(qa.route, qa.params)}
              activeOpacity={0.85}
              style={{
                width: quickActionTileWidth,
                minHeight: 64,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: qa.primary ? actionPrimaryColor : "#e2e8f0",
                backgroundColor: qa.primary ? actionPrimaryColor : "#fafbfc",
                paddingVertical: 10,
                paddingHorizontal: contentWidth < 360 ? 2 : 4,
              }}
            >
              <Ionicons
                name={qa.icon}
                size={20}
                color={qa.primary ? "#ffffff" : qa.color}
              />
              <Text
                style={{ fontSize: SIZES.FONT.sm }}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                className={`${TYPO.micro} font-semibold text-center ${qa.primary ? "text-white" : "text-slate-600"}`}
                numberOfLines={2}
              >
                {qa.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
}
