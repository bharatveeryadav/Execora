"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineBanner = OfflineBanner;
/**
 * Offline mode banner (Sprint 18).
 */
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
function OfflineBanner({ pendingCount, isSyncing, }) {
    return (react_1.default.createElement(react_native_1.View, { className: "bg-amber-500 px-4 py-2.5 flex-row items-center justify-center gap-2" },
        react_1.default.createElement(vector_icons_1.Ionicons, { name: "cloud-offline-outline", size: 18, color: "#fff" }),
        react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold text-sm" }, isSyncing
            ? "Syncing…"
            : pendingCount > 0
                ? `Offline — ${pendingCount} bill${pendingCount !== 1 ? "s" : ""} queued`
                : "Offline mode")));
}
//# sourceMappingURL=OfflineBanner.js.map