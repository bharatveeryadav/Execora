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
exports.ProductDetailScreen = ProductDetailScreen;
/**
 * ProductDetailScreen — Read-only product details view.
 * Double-tap any field to open Update Product page for editing.
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const shared_1 = require("@execora/shared");
const vector_icons_1 = require("@expo/vector-icons");
const useWsInvalidation_1 = require("../hooks/useWsInvalidation");
const useResponsive_1 = require("../hooks/useResponsive");
const constants_1 = require("../lib/constants");
function num(v) {
    if (v === undefined || v === null)
        return 0;
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isFinite(n) ? n : 0;
}
const DOUBLE_TAP_DELAY = 400;
function useDoubleTap(onDoubleTap) {
    const lastTap = (0, react_1.useRef)(0);
    return () => {
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            lastTap.current = 0;
            onDoubleTap();
        }
        else {
            lastTap.current = now;
        }
    };
}
function ProductDetailScreen({ navigation, route }) {
    const qc = (0, react_query_1.useQueryClient)();
    const { contentPad } = (0, useResponsive_1.useResponsive)();
    (0, useWsInvalidation_1.useWsInvalidation)(["products", "lowStock"]);
    const params = route.params;
    const id = params?.id ?? "";
    const passedProduct = params?.product;
    const [name, setName] = (0, react_1.useState)("");
    const [price, setPrice] = (0, react_1.useState)("");
    const [gstRate, setGstRate] = (0, react_1.useState)("");
    const [cost, setCost] = (0, react_1.useState)("");
    const [mrp, setMrp] = (0, react_1.useState)("");
    const [stock, setStock] = (0, react_1.useState)("");
    const [unit, setUnit] = (0, react_1.useState)("piece");
    const [category, setCategory] = (0, react_1.useState)("");
    const [hsnCode, setHsnCode] = (0, react_1.useState)("");
    const [barcode, setBarcode] = (0, react_1.useState)("");
    const [description, setDescription] = (0, react_1.useState)("");
    const [showAddDetailsBanner, setShowAddDetailsBanner] = (0, react_1.useState)(true);
    const goToUpdate = () => {
        navigation.navigate("UpdateProduct", { id, product });
    };
    const { data, isLoading, isError } = (0, react_query_1.useQuery)({
        queryKey: ["product", id],
        queryFn: () => shared_1.productApi.get(id),
        enabled: !!id,
        retry: false,
    });
    const fetchedProduct = data?.product;
    const product = (fetchedProduct ?? passedProduct);
    const rawImageUrl = product?.["imageUrl"];
    const needsPresigned = rawImageUrl && !rawImageUrl.startsWith("http");
    const { data: imageUrlData } = (0, react_query_1.useQuery)({
        queryKey: ["productImageUrl", id],
        queryFn: () => (0, shared_1.apiFetch)(`/api/v1/products/${id}/image-url`),
        enabled: Boolean(id && rawImageUrl && needsPresigned),
        retry: false,
    });
    const imageUrl = rawImageUrl?.startsWith("http") ? rawImageUrl : imageUrlData?.url;
    (0, react_1.useEffect)(() => {
        if (product) {
            setName(String(product.name ?? ""));
            setPrice(String(num(product.price) ?? ""));
            setGstRate(String(num(product.gstRate) ?? ""));
            setCost(String(num(product.cost) ?? ""));
            setMrp(String(num(product.mrp) ?? ""));
            setStock(String(num(product.stock) ?? ""));
            setUnit(String(product.unit ?? "piece"));
            setCategory(String(product.category ?? ""));
            setHsnCode(String(product.hsnCode ?? ""));
            setBarcode(String(product.barcode ?? ""));
            setDescription(String(product.description ?? ""));
        }
    }, [product]);
    const adjustStockMutation = (0, react_query_1.useMutation)({
        mutationFn: ({ op }) => (0, shared_1.apiFetch)(`/api/v1/products/${id}/stock`, {
            method: "PATCH",
            body: JSON.stringify({ quantity: 1, operation: op }),
        }),
        onSuccess: (data) => {
            void qc.invalidateQueries({ queryKey: ["products"] });
            void qc.invalidateQueries({ queryKey: ["product", id] });
            if (data?.product?.stock !== undefined)
                setStock(String(data.product.stock));
        },
        onError: (e) => (0, alerts_1.showAlert)("Error", e.message ?? "Stock update failed"),
    });
    const priceWithTax = num(price) * (1 + num(gstRate) / 100);
    const costWithTax = num(cost) * (1 + num(gstRate) / 100);
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
    const hasMissingDetails = !category || !hsnCode || !barcode || !description;
    const displayUnit = (unit === "kg" || unit === "KGS" ? "KGS" : unit).toUpperCase();
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-slate-50" },
        react_1.default.createElement(react_native_1.View, { style: {
                paddingHorizontal: contentPad,
                paddingVertical: constants_1.SIZES.SPACING.md,
            }, className: "flex-row items-center justify-between border-b border-slate-200 bg-white" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack(), className: "p-2 -ml-2" },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-back", size: 24, color: "#0f172a" })),
            react_1.default.createElement(react_native_1.Text, { className: "text-lg font-bold text-slate-800 flex-1 text-center", numberOfLines: 1 }, name || "Product"),
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-1" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: goToUpdate, className: "p-2" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "create-outline", size: 22, color: "#64748b" })),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => (0, alerts_1.showAlert)("More", "Options coming soon"), className: "p-2" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "ellipsis-horizontal", size: 22, color: "#64748b" })))),
        showAddDetailsBanner && hasMissingDetails && (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: goToUpdate, activeOpacity: 0.8, style: {
                marginHorizontal: contentPad,
                marginTop: constants_1.SIZES.SPACING.md,
                paddingHorizontal: contentPad,
                paddingVertical: constants_1.SIZES.SPACING.md,
                minHeight: constants_1.SIZES.TOUCH_MIN,
            }, className: "flex-row items-center justify-between rounded-xl bg-slate-200/80" },
            react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-700" }, "Add Missing Details \u2014 Tap to edit"),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowAddDetailsBanner(false), hitSlop: { top: 12, bottom: 12, left: 12, right: 12 } },
                react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 20, color: "#64748b" })))),
        react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", showsVerticalScrollIndicator: false },
            react_1.default.createElement(react_native_1.View, { style: { marginHorizontal: contentPad, marginTop: contentPad }, className: "rounded-2xl bg-white border border-slate-200 overflow-hidden" },
                react_1.default.createElement(react_native_1.Text, { style: { paddingHorizontal: contentPad, paddingTop: contentPad, paddingBottom: 8 }, className: "text-base font-bold text-slate-800" }, "Product Details"),
                react_1.default.createElement(react_native_1.Text, { style: { paddingHorizontal: contentPad, paddingBottom: 12 }, className: "text-xs text-slate-500" }, "Double-tap any field to edit"),
                react_1.default.createElement(DetailRow, { label: "Product Name*", value: name, badge: num(stock) > 0 ? "Online" : undefined, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "Selling Price", sublabel: "With Tax", value: `₹${priceWithTax.toFixed(2)}`, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "Tax Rate", value: `${gstRate}%`, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "Purchase Price", sublabel: "With Tax", value: `₹${costWithTax.toFixed(2)}`, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "Quantity", value: stock, valueGreen: true, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "Unit", value: displayUnit, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "Category", value: category || "—", addButton: !category, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "HSN/SAC Code", value: hsnCode || "—", addButton: !hsnCode, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "Type", value: "Product", contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "MRP (\u20B9)", value: mrp ? `₹${parseFloat(mrp).toFixed(2)}` : "—", onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(DetailRow, { label: "Barcode", value: barcode || "—", addButton: !barcode, onDoubleTap: goToUpdate, contentPad: contentPad }),
                react_1.default.createElement(react_native_1.View, { style: {
                        paddingHorizontal: contentPad,
                        paddingVertical: constants_1.SIZES.SPACING.md,
                    }, className: "border-t border-slate-100" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500 mb-1" }, "Product Description"),
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: goToUpdate, className: "py-2" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-sm text-slate-800" }, description || "—"))))),
        react_1.default.createElement(react_native_1.View, { style: {
                paddingHorizontal: contentPad,
                paddingTop: constants_1.SIZES.SPACING.md,
                paddingBottom: constants_1.SIZES.SPACING.xl,
            }, className: "flex-row border-t border-slate-200 bg-white" },
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => adjustStockMutation.mutate({ op: "subtract" }), disabled: adjustStockMutation.isPending || num(stock) <= 0, className: "flex-1 py-3.5 rounded-xl bg-red-500 items-center justify-center mr-2", style: {
                    minHeight: constants_1.SIZES.BUTTON.lg.minHeight,
                    opacity: num(stock) <= 0 ? 0.5 : 1,
                } }, adjustStockMutation.isPending && adjustStockMutation.variables?.op === "subtract" ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold text-base" }, "STOCK OUT"))),
            react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => adjustStockMutation.mutate({ op: "add" }), disabled: adjustStockMutation.isPending, className: "flex-1 py-3.5 rounded-xl bg-green-500 items-center justify-center ml-2", style: { minHeight: constants_1.SIZES.BUTTON.lg.minHeight } }, adjustStockMutation.isPending && adjustStockMutation.variables?.op === "add" ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "text-white font-bold text-base" }, "STOCK IN"))))));
}
function DetailRow({ label, sublabel, value, valueGreen, addButton, badge, onDoubleTap, contentPad = 16, }) {
    const handlePress = useDoubleTap(onDoubleTap ?? (() => { }));
    return (react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handlePress, activeOpacity: onDoubleTap ? 0.7 : 1, disabled: !onDoubleTap },
        react_1.default.createElement(react_native_1.View, { style: {
                paddingHorizontal: contentPad,
                paddingVertical: constants_1.SIZES.SPACING.md,
            }, className: "border-t border-slate-100" },
            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between" },
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center gap-2" },
                    react_1.default.createElement(react_native_1.View, null,
                        react_1.default.createElement(react_native_1.Text, { className: "text-xs text-slate-500" }, label),
                        sublabel && react_1.default.createElement(react_native_1.Text, { className: "text-[10px] text-slate-400 mt-0.5" }, sublabel)),
                    badge && (react_1.default.createElement(react_native_1.View, { className: "bg-green-100 px-2 py-0.5 rounded" },
                        react_1.default.createElement(react_native_1.Text, { className: "text-[10px] font-semibold text-green-700" }, badge)))),
                addButton && (react_1.default.createElement(react_native_1.View, { className: "bg-slate-200 px-3 py-1 rounded-lg" },
                    react_1.default.createElement(react_native_1.Text, { className: "text-xs font-semibold text-slate-600" }, "ADD")))),
            react_1.default.createElement(react_native_1.Text, { className: `text-sm font-medium mt-1 ${valueGreen ? "text-green-600" : "text-slate-800"}` }, value || "—"))));
}
//# sourceMappingURL=ProductDetailScreen.js.map