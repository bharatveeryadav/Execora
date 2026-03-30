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
exports.UpdateProductScreen = UpdateProductScreen;
/**
 * UpdateProductScreen — Full form for editing product details.
 * Navigated from ProductDetailScreen on double-tap of any field.
 * Layout: Add Custom Fields, Product Details, Units, Optional Fields, Update Product button.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const shared_1 = require("@execora/shared");
const ImagePicker = __importStar(require("expo-image-picker"));
const api_1 = require("../lib/api");
const storage_1 = require("../lib/storage");
const vector_icons_1 = require("@expo/vector-icons");
const BarcodeScanner_1 = require("../components/common/BarcodeScanner");
const UNITS = [
    "piece",
    "kg",
    "g",
    "l",
    "ml",
    "dozen",
    "pack",
    "box",
    "bottle",
    "bag",
    "meter",
    "sqm",
    "unit",
    "pcs",
    "set",
    "pair",
];
function num(v) {
    if (v === undefined || v === null)
        return 0;
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isFinite(n) ? n : 0;
}
function UpdateProductScreen({ navigation, route }) {
    const qc = (0, react_query_1.useQueryClient)();
    const { id = "", product: passedProduct } = route.params ?? {};
    const [type, setType] = (0, react_1.useState)("product");
    const [name, setName] = (0, react_1.useState)("");
    const [price, setPrice] = (0, react_1.useState)("");
    const [gstRate, setGstRate] = (0, react_1.useState)("");
    const [cost, setCost] = (0, react_1.useState)("");
    const [stock, setStock] = (0, react_1.useState)("");
    const [unit, setUnit] = (0, react_1.useState)("piece");
    const [category, setCategory] = (0, react_1.useState)("");
    const [hsnCode, setHsnCode] = (0, react_1.useState)("");
    const [barcode, setBarcode] = (0, react_1.useState)("");
    const [description, setDescription] = (0, react_1.useState)("");
    const [minStock, setMinStock] = (0, react_1.useState)("");
    const [isFeatured, setIsFeatured] = (0, react_1.useState)(true);
    const [showUnitPicker, setShowUnitPicker] = (0, react_1.useState)(false);
    const [optionalExpanded, setOptionalExpanded] = (0, react_1.useState)(true);
    const [showBarcodeScanner, setShowBarcodeScanner] = (0, react_1.useState)(false);
    const { data, isLoading, isError } = (0, react_query_1.useQuery)({
        queryKey: ["product", id],
        queryFn: () => shared_1.productApi.get(id),
        enabled: !!id,
        retry: false,
    });
    const fetchedProduct = data?.product;
    const product = (fetchedProduct ?? passedProduct);
    (0, react_1.useEffect)(() => {
        if (product) {
            setName(String(product.name ?? ""));
            setPrice(String(num(product.price) ?? ""));
            setGstRate(String(num(product.gstRate) ?? ""));
            setCost(String(num(product.cost) ?? ""));
            setStock(String(num(product.stock) ?? ""));
            setUnit(String(product.unit ?? "piece"));
            setCategory(String(product.category ?? ""));
            setHsnCode(String(product.hsnCode ?? ""));
            setBarcode(String(product.barcode ?? ""));
            setDescription(String(product.description ?? ""));
            setMinStock(String(num(product.minStock) ?? ""));
            setIsFeatured(product.isFeatured ?? true);
        }
    }, [product]);
    const updateMutation = (0, react_query_1.useMutation)({
        mutationFn: (payload) => (0, shared_1.apiFetch)(`/api/v1/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        }),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["products"] });
            void qc.invalidateQueries({ queryKey: ["product", id] });
            (0, alerts_1.showAlert)("", "Product updated", [
                { text: "OK", onPress: () => navigation.goBack() },
            ]);
        },
        onError: (e) => {
            (0, alerts_1.showAlert)("Error", e.message ?? "Update failed");
        },
    });
    const uploadImageMutation = (0, react_query_1.useMutation)({
        mutationFn: async (uri) => {
            const formData = new FormData();
            formData.append("file", { uri, type: "image/jpeg", name: "image.jpg" });
            const token = storage_1.tokenStorage.getToken();
            const res = await fetch(`${(0, api_1.getApiBaseUrl)()}/api/v1/products/${id}/image`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });
            if (!res.ok)
                throw new Error("Upload failed");
            return res.json();
        },
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["product", id] });
            void qc.invalidateQueries({ queryKey: ["products"] });
            (0, alerts_1.showAlert)("", "Image uploaded");
        },
        onError: () => (0, alerts_1.showAlert)("Error", "Image upload failed"),
    });
    const handleUpdate = () => {
        const payload = {};
        if (name.trim())
            payload.name = name.trim();
        const p = parseFloat(price);
        if (!isNaN(p) && p >= 0)
            payload.price = p;
        const g = parseFloat(gstRate);
        if (!isNaN(g) && g >= 0)
            payload.gstRate = g;
        const c = parseFloat(cost);
        if (!isNaN(c) && c >= 0)
            payload.cost = c;
        const s = parseInt(stock, 10);
        if (!isNaN(s) && s >= 0)
            payload.stock = s;
        payload.unit = unit || "piece";
        payload.category = category.trim() || "general";
        payload.hsnCode = hsnCode.trim() || "";
        payload.barcode = barcode.trim() || "";
        payload.description = description.trim() || "";
        const m = parseInt(minStock, 10);
        if (!isNaN(m) && m >= 0)
            payload.minStock = m;
        payload.isFeatured = isFeatured;
        updateMutation.mutate(payload);
    };
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            (0, alerts_1.showAlert)("Permission needed", "Allow access to photos to add product image.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri) {
            uploadImageMutation.mutate(result.assets[0].uri);
        }
    };
    if (!id) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 items-center justify-center px-6" },
                react_1.default.createElement(react_native_1.Text, { className: "text-slate-600" }, "No product selected"),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mt-4 bg-primary px-6 py-2 rounded-xl" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Back")))));
    }
    if (isError && !passedProduct) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 items-center justify-center px-6" },
                react_1.default.createElement(react_native_1.Text, { className: "text-slate-600" }, "Product not found"),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "mt-4 bg-primary px-6 py-2 rounded-xl" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-white font-semibold" }, "Back")))));
    }
    if ((isLoading || !product) && !passedProduct) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50" },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 items-center justify-center" },
                react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }),
                react_1.default.createElement(react_native_1.Text, { className: "mt-2 text-slate-500" }, "Loading\u2026"))));
    }
    const displayUnit = (unit === "kg" || unit === "KGS" ? "KGS" : unit).toUpperCase();
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50" },
        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-4 py-3 border-b border-slate-200 bg-white" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "p-2 -ml-2" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-back", size: 24, color: "#0f172a" })),
            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800" }, "Update Product"),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => (0, alerts_1.showAlert)("Product Settings", "Coming soon"), className: "p-2" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "cube-outline", size: 22, color: "#64748b" }))),
        react_1.default.createElement(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === "ios" ? "padding" : undefined, className: "flex-1" },
            react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: "handled" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => (0, alerts_1.showAlert)("Custom Fields", "Coming soon"), className: "mx-4 mt-3 flex-row items-center justify-between rounded-xl bg-sky-100 px-4 py-3" },
                    react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "add-circle-outline", size: 20, color: "#0284c7" }),
                        react_1.default.createElement(react_native_1.View, null,
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-bold text-slate-800" }, "Add Custom Fields"),
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-600" }, "Personalize to perfectly suit your style."))),
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "headset-outline", size: 22, color: "#64748b" })),
                react_1.default.createElement(react_native_1.View, { className: "mx-4 mt-4 rounded-2xl bg-white border border-slate-200 overflow-hidden" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800 px-4 pt-4 pb-3" }, "Product Details"),
                    react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-t border-slate-100 flex-row items-center gap-6" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setType("product"), className: "flex-row items-center gap-2" },
                            react_1.default.createElement(react_native_1.View, { className: `w-5 h-5 rounded-full border-2 items-center justify-center ${type === "product" ? "border-primary bg-primary" : "border-slate-300"}` }, type === "product" && react_1.default.createElement(react_native_1.View, { className: "w-2 h-2 rounded-full bg-white" })),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, "Product")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setType("service"), className: "flex-row items-center gap-2" },
                            react_1.default.createElement(react_native_1.View, { className: `w-5 h-5 rounded-full border-2 items-center justify-center ${type === "service" ? "border-primary bg-primary" : "border-slate-300"}` }, type === "service" && react_1.default.createElement(react_native_1.View, { className: "w-2 h-2 rounded-full bg-white" })),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-800" }, "Service"))),
                    react_1.default.createElement(FormField, { label: "Product Name*", value: name, onChangeText: setName, placeholder: "Enter name" }),
                    react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-t border-slate-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mb-1" }, "Selling price"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-400 mb-1" }, "Inclusive of taxes"),
                        react_1.default.createElement(react_native_1.TextInput, { value: price, onChangeText: setPrice, placeholder: "0.00", placeholderTextColor: "#94a3b8", keyboardType: "decimal-pad", className: "px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-base" })),
                    react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-t border-slate-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mb-1" }, "Tax rate %"),
                        react_1.default.createElement(react_native_1.TextInput, { value: gstRate, onChangeText: setGstRate, placeholder: "0.0", placeholderTextColor: "#94a3b8", keyboardType: "decimal-pad", className: "px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-base" }),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { className: "flex-row items-center gap-1 mt-2" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "add", size: 14, color: "#2563eb" }),
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-blue-600" }, "Enter GSTIN to add/change Tax"))),
                    react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-t border-slate-100" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mb-1" }, "Purchase Price"),
                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-400 mb-1" }, "Inclusive of taxes"),
                        react_1.default.createElement(react_native_1.TextInput, { value: cost, onChangeText: setCost, placeholder: "0.00", placeholderTextColor: "#94a3b8", keyboardType: "decimal-pad", className: "px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-base" }))),
                react_1.default.createElement(react_native_1.View, { className: "mx-4 mt-4 rounded-2xl bg-white border border-slate-200 overflow-hidden" },
                    react_1.default.createElement(react_native_1.View, { className: "px-4 pt-4 pb-2 flex-row items-center justify-between" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800" }, "Units"),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => (0, alerts_1.showAlert)("Add Alternative Unit", "Coming soon") },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-semibold text-blue-600" }, "Add Alternative Unit"))),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowUnitPicker(true), className: "px-4 py-3 border-t border-slate-100 flex-row items-center justify-between" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Select Unit"),
                        react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-base font-medium text-slate-800" }, displayUnit),
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-down", size: 20, color: "#64748b" })))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setOptionalExpanded(!optionalExpanded), className: "mx-4 mt-4 rounded-2xl bg-white border border-slate-200 overflow-hidden" },
                    react_1.default.createElement(react_native_1.View, { className: "px-4 py-4 flex-row items-center justify-between" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base font-bold text-slate-800" }, "Optional Fields"),
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: optionalExpanded ? "chevron-up" : "chevron-down", size: 22, color: "#64748b" })),
                    react_1.default.createElement(react_native_1.Text, { className: "px-4 pb-3 text-xs text-slate-500" }, "Description, Barcode, Category, Product Images"),
                    optionalExpanded && (react_1.default.createElement(react_native_1.View, { className: "border-t border-slate-100" },
                        react_1.default.createElement(FormField, { label: "HSN Code", value: hsnCode, onChangeText: setHsnCode, placeholder: "Select HSN Code" }),
                        react_1.default.createElement(FormField, { label: "Category", value: category, onChangeText: setCategory, placeholder: "Select Category" }),
                        react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-t border-slate-100" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mb-1" }, "Description"),
                            react_1.default.createElement(react_native_1.TextInput, { value: description, onChangeText: setDescription, placeholder: "Add Description", placeholderTextColor: "#94a3b8", multiline: true, numberOfLines: 3, className: "px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm" })),
                        react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-t border-slate-100" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mb-1" }, "Barcode"),
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                                react_1.default.createElement(react_native_1.TextInput, { value: barcode, onChangeText: setBarcode, placeholder: "Add Barcode", placeholderTextColor: "#94a3b8", className: "flex-1 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm" }),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowBarcodeScanner(true), className: "p-2.5 rounded-lg bg-slate-100" },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "barcode-outline", size: 24, color: "#64748b" })))),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: pickImage, className: "px-4 py-3 border-t border-slate-100 flex-row items-center justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-500" }, "Product Images"),
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-600" }, "Add Product Images"),
                                react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-forward", size: 18, color: "#64748b" }))),
                        react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-t border-slate-100 flex-row items-center justify-between" },
                            react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-700" }, "Show in online store"),
                            react_1.default.createElement(react_native_1.Switch, { value: isFeatured, onValueChange: setIsFeatured, trackColor: { false: "#cbd5e1", true: "#e67e22" }, thumbColor: "#fff" })),
                        react_1.default.createElement(FormField, { label: "Low Stock Alert at", value: minStock, onChangeText: setMinStock, placeholder: "0", keyboardType: "number-pad" })))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleUpdate, disabled: updateMutation.isPending, className: "mx-4 mt-6 mb-8 flex-row items-center justify-center gap-2 bg-primary py-4 rounded-xl" }, updateMutation.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold text-base" }, "Update Product"))))),
        react_1.default.createElement(react_native_1.Modal, { visible: showUnitPicker, transparent: true, animationType: "slide" },
            react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/50 justify-end", onPress: () => setShowUnitPicker(false) },
                react_1.default.createElement(react_native_1.View, { className: "bg-white rounded-t-3xl max-h-[60%]" },
                    react_1.default.createElement(react_native_1.View, { className: "w-10 h-1 rounded-full bg-slate-200 self-center mt-3 mb-4" }),
                    react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold px-5 mb-3" }, "Select unit"),
                    react_1.default.createElement(react_native_1.ScrollView, { className: "max-h-64 px-5 pb-8" }, UNITS.map((u) => (react_1.default.createElement(react_native_1.Pressable, { key: u, onPress: () => {
                            setUnit(u);
                            setShowUnitPicker(false);
                        }, className: "py-3.5 border-b border-slate-100 flex-row items-center justify-between" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-base text-slate-800" }, u),
                        unit === u && react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark", size: 20, color: "#e67e22" })))))))),
        react_1.default.createElement(BarcodeScanner_1.BarcodeScanner, { visible: showBarcodeScanner, onClose: () => setShowBarcodeScanner(false), onScan: (code) => {
                setBarcode(code);
                setShowBarcodeScanner(false);
            } })));
}
function FormField({ label, value, onChangeText, placeholder, keyboardType = "default", }) {
    return (react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-t border-slate-100" },
        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mb-1" }, label),
        react_1.default.createElement(react_native_1.TextInput, { value: value, onChangeText: onChangeText, placeholder: placeholder, placeholderTextColor: "#94a3b8", keyboardType: keyboardType, className: "px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-base" })));
}
//# sourceMappingURL=UpdateProductScreen.js.map