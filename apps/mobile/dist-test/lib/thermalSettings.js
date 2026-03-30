"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThermalConfig = getThermalConfig;
exports.setThermalConfig = setThermalConfig;
/**
 * Thermal print settings — stored in MMKV (Sprint 17).
 */
const storage_1 = require("./storage");
const KEY = "execora:thermal";
const DEFAULT = {
    width: 80,
    header: "",
    footer: "Thank you! Visit again.",
};
function getThermalConfig() {
    try {
        const raw = storage_1.storage.getString(KEY);
        if (!raw)
            return DEFAULT;
        const parsed = JSON.parse(raw);
        return {
            width: parsed.width === 58 ? 58 : 80,
            header: String(parsed.header ?? ""),
            footer: String(parsed.footer ?? DEFAULT.footer),
        };
    }
    catch {
        return DEFAULT;
    }
}
function setThermalConfig(config) {
    storage_1.storage.set(KEY, JSON.stringify(config));
}
//# sourceMappingURL=thermalSettings.js.map