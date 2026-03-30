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
exports.hapticLight = hapticLight;
exports.hapticSuccess = hapticSuccess;
exports.hapticError = hapticError;
exports.hapticSelection = hapticSelection;
/**
 * Haptic feedback helpers (Sprint 19).
 * Light: buttons, selections. Success: save/record. Error: failures.
 */
const Haptics = __importStar(require("expo-haptics"));
function hapticLight() {
    try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    catch {
        // Ignore on unsupported platforms
    }
}
function hapticSuccess() {
    try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    catch {
        // Ignore on unsupported platforms
    }
}
function hapticError() {
    try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    catch {
        // Ignore on unsupported platforms
    }
}
function hapticSelection() {
    try {
        Haptics.selectionAsync();
    }
    catch {
        // Ignore on unsupported platforms
    }
}
//# sourceMappingURL=haptics.js.map