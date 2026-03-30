"use strict";
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
exports.SettingsThermalScreen = SettingsThermalScreen;
/**
 * Thermal Print Settings — 58mm/80mm, header, footer (Sprint 17).
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const thermalSettings_1 = require("../lib/thermalSettings");
const printReceipt_1 = require("../lib/printReceipt");
const useResponsive_1 = require("../hooks/useResponsive");
function SettingsThermalScreen({ navigation }) {
    const { contentPad } = (0, useResponsive_1.useResponsive)();
    const [width, setWidth] = (0, react_1.useState)(80);
    const [header, setHeader] = (0, react_1.useState)("");
    const [footer, setFooter] = (0, react_1.useState)("Thank you! Visit again.");
    (0, react_1.useEffect)(() => {
        const c = (0, thermalSettings_1.getThermalConfig)();
        setWidth(c.width);
        setHeader(c.header);
        setFooter(c.footer);
    }, []);
    const handleSave = () => {
        (0, thermalSettings_1.setThermalConfig)({ width, header, footer });
        (0, alerts_1.showAlert)("Saved", "Thermal print settings saved.");
    };
    const handleTestPrint = async () => {
        const sampleData = {
            shopName: "My Shop",
            invoiceNo: "TEST-001",
            date: new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }),
            customerName: "Test Customer",
            items: [
                { name: "Sample Item 1", qty: 2, rate: 50, discountPct: 0, amount: 100 },
                { name: "Sample Item 2", qty: 1, rate: 75, discountPct: 10, amount: 67.5 },
            ],
            subtotal: 167.5,
            discountAmt: 0,
            taxableAmt: 167.5,
            withGst: false,
            totalGst: 0,
            grandTotal: 167.5,
            roundOff: 0,
            finalTotal: 167.5,
            amountInWords: "One Hundred Sixty Seven Rupees Fifty Paise Only",
            payments: [{ mode: "cash", amount: 167.5 }],
        };
        try {
            await (0, printReceipt_1.printReceipt)(sampleData);
        }
        catch (e) {
            (0, alerts_1.showAlert)("Print", e.message ?? "Could not print");
        }
    };
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { style: { paddingHorizontal: contentPad, paddingVertical: 12 }, className: "flex-row items-center border-b border-slate-200" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "p-2 -ml-2" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-back", size: 24, color: "#0f172a" })),
            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 flex-1 ml-2" }, "Thermal Print")),
        react_1.default.createElement(react_native_1.ScrollView, { style: { flex: 1, paddingHorizontal: contentPad, paddingVertical: contentPad } },
            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 uppercase font-semibold mb-2" }, "Paper Width"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row gap-3 mb-4" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setWidth(58), className: `flex-1 py-3 rounded-xl border-2 items-center ${width === 58 ? "border-primary bg-primary/5" : "border-slate-200"}` },
                    react_1.default.createElement(react_native_1.Text, { className: `font-semibold ${width === 58 ? "text-primary" : "text-slate-600"}` }, "58mm"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "32 chars/line")),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setWidth(80), className: `flex-1 py-3 rounded-xl border-2 items-center ${width === 80 ? "border-primary bg-primary/5" : "border-slate-200"}` },
                    react_1.default.createElement(react_native_1.Text, { className: `font-semibold ${width === 80 ? "text-primary" : "text-slate-600"}` }, "80mm"),
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "48 chars/line"))),
            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 uppercase font-semibold mb-2" }, "Custom Header (optional)"),
            react_1.default.createElement(react_native_1.TextInput, { value: header, onChangeText: setHeader, placeholder: "e.g. Visit again!", placeholderTextColor: "#94a3b8", className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-4" }),
            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 uppercase font-semibold mb-2" }, "Footer Text"),
            react_1.default.createElement(react_native_1.TextInput, { value: footer, onChangeText: setFooter, placeholder: "Thank you! Visit again.", placeholderTextColor: "#94a3b8", className: "bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-6" }),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleSave, className: "bg-primary py-3 rounded-xl items-center mb-3" },
                react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold" }, "Save Settings")),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => void handleTestPrint(), className: "flex-row items-center justify-center gap-2 py-3 rounded-xl border border-slate-200" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "print-outline", size: 20, color: "#64748b" }),
                react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-slate-600" }, "Test Print")),
            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-400 mt-6 text-center" }, "Receipt prints as PDF via share sheet. Use \"Print\" from billing after saving an invoice."))));
}
//# sourceMappingURL=SettingsThermalScreen.js.map