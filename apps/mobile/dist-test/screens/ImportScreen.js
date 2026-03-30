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
exports.ImportScreen = ImportScreen;
/**
 * ImportScreen — CSV import for Customers and Vendors (mobile-friendly).
 * Flow: Choose type → Download template / Pick file → Preview → Import.
 * Uses expo-document-picker, expo-file-system, expo-sharing per Expo docs.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const vector_icons_1 = require("@expo/vector-icons");
const DocumentPicker = __importStar(require("expo-document-picker"));
const FileSystem = __importStar(require("expo-file-system"));
const Sharing = __importStar(require("expo-sharing"));
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("../lib/api");
const CONFIGS = {
    customers: {
        type: "customers",
        label: "Customers",
        columns: ["Name", "Phone", "Email", "Address", "GST Number", "Opening Balance"],
        example: [
            ["Ramesh Traders", "9876543210", "ramesh@example.com", "Delhi", "07AAAAA0000A1Z5", "2500"],
            ["Suresh Kirana", "9123456780", "", "Mumbai", "", "0"],
        ],
    },
    vendors: {
        type: "vendors",
        label: "Vendors",
        columns: ["Name", "Company Name", "Phone", "Email", "Address", "GSTIN"],
        example: [
            ["Ramesh", "Ramesh Traders Pvt Ltd", "9876543210", "ramesh@vendor.com", "Delhi", "07AAAAA0000A1Z5"],
            ["Suresh", "Suresh Wholesale", "9123456780", "", "Mumbai", ""],
        ],
    },
};
function parseCsv(text, config) {
    const lines = text.trim().split("\n");
    if (lines.length < 2)
        return [];
    const headers = lines[0]
        .split(",")
        .map((h) => h.replace(/^"|"$/g, "").trim());
    return lines.slice(1, 51).map((line, i) => {
        const vals = line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
        const data = {};
        headers.forEach((h, j) => {
            data[h] = vals[j] ?? "";
        });
        const requiredCol = config.columns[0];
        const valid = !!data[requiredCol];
        return { row: i + 2, data, valid };
    });
}
function buildTemplateCsv(config) {
    const header = config.columns.join(",");
    const rows = config.example.map((r) => r.map((v) => `"${v}"`).join(","));
    return [header, ...rows].join("\n");
}
function ImportScreen({ navigation, route }) {
    const qc = (0, react_query_1.useQueryClient)();
    const typeParam = route.params?.type;
    const initialType = typeParam === "customers" || typeParam === "vendors" ? typeParam : "customers";
    const [step, setStep] = (0, react_1.useState)(1);
    const [entityType, setEntityType] = (0, react_1.useState)(initialType);
    const [previewRows, setPreviewRows] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [fileName, setFileName] = (0, react_1.useState)("");
    const [done, setDone] = (0, react_1.useState)(false);
    const config = CONFIGS[entityType];
    const validRows = previewRows.filter((r) => r.valid);
    const invalidCount = previewRows.filter((r) => !r.valid).length;
    async function handleDownloadTemplate() {
        const csv = buildTemplateCsv(config);
        const filename = `import-${config.type}-template.csv`;
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, "\uFEFF" + csv, {
            encoding: FileSystem.EncodingType.UTF8,
        });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(path, {
                mimeType: "text/csv",
                dialogTitle: `Save ${config.label} template`,
            });
        }
        else {
            (0, alerts_1.showAlert)("Template ready", `Template saved to cache. Use a file manager to access ${filename}`);
        }
    }
    async function handlePickFile() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "text/csv",
                copyToCacheDirectory: true,
            });
            if (result.canceled)
                return;
            const asset = result.assets[0];
            const content = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            setFileName(asset.name);
            setPreviewRows(parseCsv(content, config));
            setStep(3);
        }
        catch (err) {
            (0, alerts_1.showAlert)("Error", err?.message ?? "Could not read file");
        }
    }
    async function handleImport() {
        setLoading(true);
        try {
            const results = await Promise.allSettled(validRows.map((r) => {
                const d = r.data;
                if (entityType === "customers") {
                    return api_1.customerExtApi.create({
                        name: d["Name"] ?? "",
                        phone: d["Phone"] || undefined,
                        email: d["Email"] || undefined,
                        landmark: d["Address"] || undefined,
                        notes: d["GST Number"] ? `GSTIN: ${d["GST Number"]}` : undefined,
                        openingBalance: d["Opening Balance"] ? parseFloat(d["Opening Balance"]) : undefined,
                    });
                }
                return api_1.supplierApi.create({
                    name: d["Name"] ?? "",
                    companyName: d["Company Name"] || undefined,
                    phone: d["Phone"] || undefined,
                    email: d["Email"] || undefined,
                    address: d["Address"] || undefined,
                    gstin: d["GSTIN"] || undefined,
                });
            }));
            const succeeded = results.filter((r) => r.status === "fulfilled").length;
            const failed = results.filter((r) => r.status === "rejected").length;
            setLoading(false);
            setDone(true);
            setStep(4);
            qc.invalidateQueries({ queryKey: ["customers"] });
            qc.invalidateQueries({ queryKey: ["suppliers"] });
            let msg = `✅ ${succeeded} ${config.label} imported successfully!`;
            if (failed > 0)
                msg += `\n${failed} rows failed.`;
            if (invalidCount > 0)
                msg += `\n${invalidCount} rows skipped (invalid).`;
            (0, alerts_1.showAlert)("Import complete", msg, [
                { text: "OK", onPress: () => navigation.goBack() },
            ]);
        }
        catch (err) {
            setLoading(false);
            (0, alerts_1.showAlert)("Import failed", err?.message ?? "Unknown error");
        }
    }
    function reset() {
        setStep(1);
        setPreviewRows([]);
        setFileName("");
        setDone(false);
    }
    const canGoBack = step > 1 && !done;
    const steps = ["Type", "Upload", "Preview", "Import"];
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-background", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center border-b border-slate-200 bg-card px-4 py-3" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => (canGoBack ? setStep((s) => (s - 1)) : navigation.goBack()), className: "mr-3 p-1" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-back", size: 24, color: "#0f172a" })),
            react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" }, "Import Data"),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "Bulk import from CSV"))),
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-4 py-2 border-b border-slate-100" }, steps.map((label, i) => (react_1.default.createElement(react_native_1.View, { key: label, className: "flex-row items-center" },
            react_1.default.createElement(react_native_1.View, { className: `h-6 w-6 rounded-full items-center justify-center ${step > i + 1 ? "bg-green-500" : step === i + 1 ? "bg-primary" : "bg-slate-200"}` },
                react_1.default.createElement(react_native_1.Text, { className: `text-xs font-bold ${step > i + 1 || step === i + 1 ? "text-white" : "text-slate-500"}` }, step > i + 1 ? "✓" : i + 1)),
            react_1.default.createElement(react_native_1.Text, { className: `ml-1 text-[10px] font-medium ${step === i + 1 ? "text-slate-800" : "text-slate-500"}` }, label),
            i < steps.length - 1 && react_1.default.createElement(react_native_1.View, { className: "ml-2 h-px w-4 bg-slate-200" }))))),
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: { padding: 16, paddingBottom: 32 } },
            step === 1 && (react_1.default.createElement(react_native_1.View, { className: "gap-4" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700" }, "What do you want to import?"),
                react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" }, ["customers", "vendors"].map((t) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: t, onPress: () => setEntityType(t), className: `flex-1 rounded-xl border-2 p-4 items-center ${entityType === t ? "border-primary bg-primary/5" : "border-slate-200 bg-white"}` },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: t === "customers" ? "people" : "cube", size: 32, color: entityType === t ? "#e67e22" : "#64748b" }),
                    react_1.default.createElement(react_native_1.Text, { className: `mt-2 text-sm font-semibold ${entityType === t ? "text-primary" : "text-slate-600"}` }, CONFIGS[t].label))))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setStep(2), className: "mt-4 bg-primary rounded-xl py-3 items-center" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Continue")))),
            step === 2 && (react_1.default.createElement(react_native_1.View, { className: "gap-4" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700" }, "Upload your CSV file"),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "Download the template, fill it with your data, then pick the file."),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleDownloadTemplate, className: "flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-4" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "download", size: 24, color: "#64748b" }),
                    react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, "Download template"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" },
                            "import-",
                            config.type,
                            "-template.csv"))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handlePickFile, className: "flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-4" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "document-attach", size: 24, color: "#64748b" }),
                    react_1.default.createElement(react_native_1.View, { className: "flex-1" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, "Pick CSV file"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, "Select from device")),
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 20, color: "#94a3b8" })))),
            step === 3 && (react_1.default.createElement(react_native_1.View, { className: "gap-4" },
                react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-slate-700" }, "Preview"),
                react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" },
                    fileName,
                    " \u2014 ",
                    validRows.length,
                    " valid rows, ",
                    invalidCount,
                    " skipped"),
                react_1.default.createElement(react_native_1.View, { className: "rounded-xl border border-slate-200 bg-white overflow-hidden" },
                    validRows.slice(0, 5).map((r, i) => (react_1.default.createElement(react_native_1.View, { key: i, className: "flex-row flex-wrap gap-2 p-3 border-b border-slate-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs font-medium text-slate-600" }, r.data["Name"] ?? "—"),
                        r.data["Phone"] ? react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, r.data["Phone"]) : null))),
                    validRows.length > 5 && (react_1.default.createElement(react_native_1.Text, { className: "p-3 text-xs text-slate-500" },
                        "+ ",
                        validRows.length - 5,
                        " more"))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleImport, disabled: loading || validRows.length === 0, className: `mt-4 rounded-xl py-3 items-center ${validRows.length === 0 || loading ? "bg-slate-300" : "bg-primary"}` }, loading ? (react_1.default.createElement(react_native_1.ActivityIndicator, { color: "#fff", size: "small" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" },
                    "Import ",
                    validRows.length,
                    " ",
                    config.label))))),
            step === 4 && done && (react_1.default.createElement(react_native_1.View, { className: "items-center py-12" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark-circle", size: 64, color: "#22c55e" }),
                react_1.default.createElement(react_native_1.Text, { className: "mt-4 text-lg font-bold text-slate-800" }, "Import complete"),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mt-6 bg-primary rounded-xl px-6 py-3" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Back to Parties")))))));
}
//# sourceMappingURL=ImportScreen.js.map