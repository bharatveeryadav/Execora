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
exports.BarcodeScanner = BarcodeScanner;
/**
 * BarcodeScanner — native camera barcode/QR scanner (Sprint 15).
 * Used in Billing (item search) and Items (add product).
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const expo_camera_1 = require("expo-camera");
const vector_icons_1 = require("@expo/vector-icons");
const haptics_1 = require("../../lib/haptics");
const constants_1 = require("../../lib/constants");
const BARCODE_TYPES = [
    "ean13",
    "ean8",
    "upc_a",
    "upc_e",
    "code128",
    "code39",
    "qr",
];
function BarcodeScanner({ visible, onClose, onScan, hint = "Point camera at product barcode", }) {
    const [permission, requestPermission] = (0, expo_camera_1.useCameraPermissions)();
    const [scanning, setScanning] = (0, react_1.useState)(true);
    const lastScanned = (0, react_1.useRef)(null);
    const debounceRef = (0, react_1.useRef)(null);
    const handleBarcodeScanned = (0, react_1.useCallback)((result) => {
        const data = result?.data ?? "";
        if (!data?.trim() || lastScanned.current === data)
            return;
        lastScanned.current = data;
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            lastScanned.current = null;
        }, 2000);
        setScanning(false);
        (0, haptics_1.hapticLight)();
        react_native_1.Vibration.vibrate(100);
        onScan(data.trim());
        onClose();
    }, [onScan, onClose]);
    const handleClose = () => {
        setScanning(true);
        lastScanned.current = null;
        onClose();
    };
    if (!visible)
        return null;
    if (!permission) {
        return (react_1.default.createElement(react_native_1.Modal, { visible: true, animationType: "slide", transparent: true },
            react_1.default.createElement(react_native_1.View, { style: styles.centered },
                react_1.default.createElement(react_native_1.View, { style: styles.card },
                    react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }),
                    react_1.default.createElement(react_native_1.Text, { style: styles.cardText }, "Checking camera permission\u2026")))));
    }
    if (!permission.granted) {
        return (react_1.default.createElement(react_native_1.Modal, { visible: true, animationType: "slide", transparent: true },
            react_1.default.createElement(react_native_1.View, { style: styles.centered },
                react_1.default.createElement(react_native_1.View, { style: styles.card },
                    react_1.default.createElement(react_native_1.Text, { style: styles.cardTitle }, "Camera access needed"),
                    react_1.default.createElement(react_native_1.Text, { style: styles.cardText }, "Execora needs camera access to scan product barcodes."),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: requestPermission, style: styles.primaryButton },
                        react_1.default.createElement(react_native_1.Text, { style: styles.primaryButtonText }, "Allow camera")),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleClose, style: styles.secondaryButton },
                        react_1.default.createElement(react_native_1.Text, { style: styles.secondaryButtonText }, "Cancel"))))));
    }
    return (react_1.default.createElement(react_native_1.Modal, { visible: true, animationType: "slide" },
        react_1.default.createElement(react_native_1.View, { style: styles.container },
            react_1.default.createElement(react_native_1.View, { style: styles.header },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleClose, style: styles.closeButton },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 28, color: "#fff" })),
                react_1.default.createElement(react_native_1.Text, { style: styles.title }, "Scan barcode"),
                react_1.default.createElement(react_native_1.View, { style: styles.placeholder })),
            react_1.default.createElement(react_native_1.View, { style: styles.cameraWrap },
                react_1.default.createElement(expo_camera_1.CameraView, { style: react_native_1.StyleSheet.absoluteFill, facing: "back", barcodeScannerSettings: {
                        barcodeTypes: [...BARCODE_TYPES],
                    }, onBarcodeScanned: scanning ? handleBarcodeScanned : undefined }),
                react_1.default.createElement(react_native_1.View, { style: styles.viewfinder })),
            react_1.default.createElement(react_native_1.View, { style: styles.footer },
                react_1.default.createElement(react_native_1.Text, { style: styles.hint }, hint)))));
}
const styles = react_native_1.StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        margin: 24,
        alignItems: "center",
        minWidth: 280,
    },
    cardTitle: {
        fontSize: constants_1.SIZES.FONT.xl,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 8,
    },
    cardText: {
        fontSize: constants_1.SIZES.FONT.base,
        color: "#64748b",
        textAlign: "center",
        marginBottom: 16,
    },
    primaryButton: {
        minHeight: constants_1.SIZES.TOUCH_MIN,
        backgroundColor: "#e67e22",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: "100%",
        alignItems: "center",
        marginBottom: 8,
    },
    primaryButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: constants_1.SIZES.FONT.lg,
    },
    secondaryButton: { minHeight: constants_1.SIZES.TOUCH_MIN, paddingVertical: 12 },
    secondaryButtonText: { color: "#64748b", fontSize: constants_1.SIZES.FONT.lg },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    closeButton: { padding: 8 },
    title: { fontSize: constants_1.SIZES.FONT.xl, fontWeight: "600", color: "#fff" },
    placeholder: { width: 44 },
    cameraWrap: { flex: 1, position: "relative" },
    viewfinder: {
        position: "absolute",
        top: "50%",
        left: "10%",
        right: "10%",
        height: 200,
        marginTop: -100,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.6)",
        borderRadius: 12,
    },
    footer: {
        padding: 24,
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    hint: { fontSize: constants_1.SIZES.FONT.base, color: "#94a3b8", textAlign: "center" },
});
//# sourceMappingURL=BarcodeScanner.js.map