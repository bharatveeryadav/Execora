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
exports.printReceipt = printReceipt;
/**
 * Print receipt via PDF + share (Sprint 17).
 * BLE thermal printer support can be added later with react-native-ble-plx.
 */
const Print = __importStar(require("expo-print"));
const Sharing = __importStar(require("expo-sharing"));
const thermalReceipt_1 = require("./thermalReceipt");
const thermalSettings_1 = require("./thermalSettings");
async function printReceipt(data) {
    const config = (0, thermalSettings_1.getThermalConfig)();
    const html = (0, thermalReceipt_1.buildReceiptHtml)(data, config);
    // 80mm ≈ 302px at 96dpi, 58mm ≈ 219px
    const widthPx = config.width === 58 ? 219 : 302;
    const heightPx = 800; // auto height
    const { uri } = await Print.printToFileAsync({
        html,
        width: widthPx,
        height: heightPx,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Receipt ${data.invoiceNo}`,
        });
    }
}
//# sourceMappingURL=printReceipt.js.map