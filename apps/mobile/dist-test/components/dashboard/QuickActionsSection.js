"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickActionsSection = QuickActionsSection;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const typography_1 = require("../../lib/typography");
const constants_1 = require("../../lib/constants");
const typography_2 = require("../../lib/typography");
function QuickActionsSection({ canToggleQuickActions, quickActionsExpanded, compactQuickActionsHeader, addCtaScale, addCtaGlow, quickActionTileWidth, contentWidth, visibleQuickActions, actionPrimaryColor, onToggleExpand, onOpenAddTransaction, onQuickAction, }) {
    return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement(react_native_1.View, { style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 12,
            } },
            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle, style: { flexShrink: 1 } }, "Quick Actions"),
            react_1.default.createElement(react_native_1.View, { style: { flexDirection: "row", alignItems: "center", gap: 6 } },
                canToggleQuickActions && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onToggleExpand, activeOpacity: 0.8, style: { minHeight: constants_1.SIZES.TOUCH_MIN }, className: "flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1" },
                    react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.sm }, maxFontSizeMultiplier: typography_2.MAX_FONT_SIZE_MULTIPLIER, className: "text-xs font-semibold text-slate-600", numberOfLines: 1 }, quickActionsExpanded
                        ? compactQuickActionsHeader
                            ? "Less"
                            : "Hide"
                        : compactQuickActionsHeader
                            ? "More"
                            : "Show all"),
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: quickActionsExpanded ? "chevron-up" : "chevron-down", size: 14, color: "#64748b" }))),
                react_1.default.createElement(react_native_1.Animated.View, { style: { transform: [{ scale: addCtaScale }] } },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: onOpenAddTransaction, activeOpacity: 0.85, className: "flex-row items-center gap-1 rounded-full border border-primary/35 bg-primary/15 px-2.5 py-1", style: {
                            minHeight: constants_1.SIZES.TOUCH_MIN,
                            shadowColor: actionPrimaryColor,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 6,
                            elevation: 2,
                        } },
                        react_1.default.createElement(react_native_1.Animated.View, { style: {
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: actionPrimaryColor,
                                opacity: addCtaGlow,
                            } },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "add", size: 12, color: "#fff" })),
                        react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.sm }, maxFontSizeMultiplier: typography_2.MAX_FONT_SIZE_MULTIPLIER, className: "text-xs font-semibold text-primary", numberOfLines: 1 }, compactQuickActionsHeader ? "Add" : "Add Transaction"))))),
        react_1.default.createElement(react_native_1.View, { style: { marginBottom: 20 } },
            react_1.default.createElement(react_native_1.View, { style: { flexDirection: "row", flexWrap: "wrap", gap: 8 } }, visibleQuickActions.map((qa) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: qa.label, onPress: () => onQuickAction(qa.route, qa.params), activeOpacity: 0.85, style: {
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
                } },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: qa.icon, size: 20, color: qa.primary ? "#ffffff" : qa.color }),
                react_1.default.createElement(react_native_1.Text, { style: { fontSize: constants_1.SIZES.FONT.sm }, maxFontSizeMultiplier: typography_2.MAX_FONT_SIZE_MULTIPLIER, className: `${typography_1.TYPO.micro} font-semibold text-center ${qa.primary ? "text-white" : "text-slate-600"}`, numberOfLines: 2 }, qa.label))))))));
}
//# sourceMappingURL=QuickActionsSection.js.map