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
exports.CompanyProfileScreen = CompanyProfileScreen;
/**
 * CompanyProfileScreen — Edit business/company details.
 * Logo upload, business name, GST, address, bank, business type (modal picker).
 */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const alerts_1 = require("../lib/alerts");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const react_query_1 = require("@tanstack/react-query");
const ImagePicker = __importStar(require("expo-image-picker"));
const vector_icons_1 = require("@expo/vector-icons");
const api_1 = require("../lib/api");
const storage_1 = require("../lib/storage");
const typography_1 = require("../lib/typography");
const BUSINESS_TYPES = [
    "Retail / Shops",
    "Wholesale / Distribution",
    "Ecommerce / Online Shopping",
    "Manufacturing",
    "Trading",
    "Export / Import",
    "Service / Consultation",
    "IT & Software",
    "Transport & Logistics",
    "Agriculture",
    "Others",
];
const LABEL = "text-sm font-medium text-slate-600";
const INPUT = "border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-800";
function CompanyProfileScreen({ navigation }) {
    const qc = (0, react_query_1.useQueryClient)();
    const { data: meData, isLoading } = (0, react_query_1.useQuery)({
        queryKey: ["auth", "me"],
        queryFn: () => api_1.authApi.me(),
        staleTime: 0,
    });
    const user = (meData?.user ?? {});
    const tenant = user?.tenant;
    const settings = (tenant?.settings ?? {});
    const [companyName, setCompanyName] = (0, react_1.useState)("");
    const [tradeName, setTradeName] = (0, react_1.useState)("");
    const [gstEnabled, setGstEnabled] = (0, react_1.useState)(false);
    const [gstin, setGstin] = (0, react_1.useState)("");
    const [phone, setPhone] = (0, react_1.useState)("");
    const [email, setEmail] = (0, react_1.useState)("");
    const [billingAddress, setBillingAddress] = (0, react_1.useState)("");
    const [shippingAddress, setShippingAddress] = (0, react_1.useState)("");
    const [businessType, setBusinessType] = (0, react_1.useState)("");
    const [pan, setPan] = (0, react_1.useState)("");
    const [altContact, setAltContact] = (0, react_1.useState)("");
    const [website, setWebsite] = (0, react_1.useState)("");
    const [showOptional, setShowOptional] = (0, react_1.useState)(false);
    const [bankAccountHolder, setBankAccountHolder] = (0, react_1.useState)("");
    const [bankName, setBankName] = (0, react_1.useState)("");
    const [bankAccountNo, setBankAccountNo] = (0, react_1.useState)("");
    const [bankIfsc, setBankIfsc] = (0, react_1.useState)("");
    const [logoObjectKey, setLogoObjectKey] = (0, react_1.useState)(null);
    const [logoDataUrl, setLogoDataUrl] = (0, react_1.useState)(null);
    const [businessTypeModalOpen, setBusinessTypeModalOpen] = (0, react_1.useState)(false);
    const [logoUploading, setLogoUploading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!logoObjectKey) {
            setLogoDataUrl(null);
            return;
        }
        const token = storage_1.tokenStorage.getToken();
        if (!token)
            return;
        let cancelled = false;
        fetch(`${(0, api_1.getApiBaseUrl)()}/api/v1/tenant/logo`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => (res.ok ? res.arrayBuffer() : null))
            .then((arrayBuffer) => {
            if (cancelled || !arrayBuffer)
                return;
            try {
                const bytes = new Uint8Array(arrayBuffer);
                let binary = "";
                for (let i = 0; i < bytes.length; i++)
                    binary += String.fromCharCode(bytes[i]);
                const base64 = btoa(binary);
                if (!cancelled)
                    setLogoDataUrl(`data:image/jpeg;base64,${base64}`);
            }
            catch {
                /* base64 conversion failed */
            }
        })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [logoObjectKey]);
    (0, react_1.useEffect)(() => {
        if (tenant) {
            setCompanyName(tenant.legalName ?? tenant.name ?? "");
            setTradeName(tenant.tradeName ?? "");
            setGstEnabled(!!tenant.gstin);
            setGstin(tenant.gstin ?? "");
            setPhone(String(settings.phone ?? ""));
            setEmail(String(settings.email ?? ""));
            setBillingAddress(String(settings.billingAddress ?? settings.address ?? ""));
            setShippingAddress(String(settings.shippingAddress ?? ""));
            setBusinessType(String(settings.businessType ?? ""));
            setPan(String(settings.pan ?? ""));
            setAltContact(String(settings.altContact ?? ""));
            setWebsite(String(settings.website ?? ""));
            setBankAccountHolder(String(settings.bankAccountHolder ?? ""));
            setBankName(String(settings.bankName ?? ""));
            setBankAccountNo(String(settings.bankAccountNo ?? ""));
            setBankIfsc(String(settings.bankIfsc ?? ""));
            setLogoObjectKey(settings.logoObjectKey ?? null);
        }
    }, [tenant, settings]);
    const pickLogo = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            (0, alerts_1.showAlert)("Permission needed", "Allow access to photos to upload your logo.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (result.canceled || !result.assets[0])
            return;
        const { uri, mimeType } = result.assets[0];
        setLogoUploading(true);
        try {
            const { logoObjectKey: key } = await api_1.authExtApi.uploadLogo(uri, mimeType ?? "image/jpeg");
            setLogoObjectKey(key);
            void qc.invalidateQueries({ queryKey: ["auth", "me"] });
            (0, alerts_1.showAlert)("", "Logo uploaded successfully");
        }
        catch (e) {
            (0, alerts_1.showAlert)("Upload failed", e.message ?? "Please try again.");
        }
        finally {
            setLogoUploading(false);
        }
    };
    const updateProfile = (0, react_query_1.useMutation)({
        mutationFn: (data) => api_1.authExtApi.updateProfile(data),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["auth", "me"] });
            (0, alerts_1.showAlert)("", "Company details saved ✅");
        },
        onError: (e) => (0, alerts_1.showAlert)("Error", e.message ?? "Failed to save"),
    });
    const handleSave = () => {
        updateProfile.mutate({
            tenant: {
                name: companyName || undefined,
                legalName: companyName || undefined,
                tradeName: tradeName || undefined,
                gstin: gstEnabled ? gstin || undefined : undefined,
                settings: {
                    phone: phone || undefined,
                    email: email || undefined,
                    billingAddress: billingAddress || undefined,
                    shippingAddress: shippingAddress || undefined,
                    address: billingAddress || undefined,
                    businessType: businessType || undefined,
                    pan: pan || undefined,
                    altContact: altContact || undefined,
                    website: website || undefined,
                    bankAccountHolder: bankAccountHolder || undefined,
                    bankName: bankName || undefined,
                    bankAccountNo: bankAccountNo || undefined,
                    bankIfsc: bankIfsc || undefined,
                },
            },
        });
    };
    const copyToShipping = () => setShippingAddress(billingAddress);
    const shareAddress = () => {
        const text = billingAddress || companyName;
        if (text)
            react_native_1.Share.share({ message: text, title: "Business Address" });
    };
    if (isLoading) {
        return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
            react_1.default.createElement(react_native_1.View, { className: "flex-1 items-center justify-center" },
                react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" }))));
    }
    return (react_1.default.createElement(react_native_safe_area_context_1.SafeAreaView, { className: "flex-1 bg-white", edges: ["top", "bottom"] },
        react_1.default.createElement(react_native_1.KeyboardAvoidingView, { behavior: react_native_1.Platform.OS === "ios" ? "padding" : undefined, className: "flex-1" },
            react_1.default.createElement(react_native_1.View, { className: "px-4 py-3 border-b border-slate-100 flex-row items-center justify-between" },
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => navigation.goBack() },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "arrow-back", size: 24, color: "#0f172a" })),
                react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.sectionTitle }, "Company Details"),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: handleSave, disabled: updateProfile.isPending, className: "bg-primary px-4 py-2 rounded-lg" }, updateProfile.isPending ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "small", color: "#fff" })) : (react_1.default.createElement(react_native_1.Text, { className: "font-semibold text-white" }, "Save")))),
            react_1.default.createElement(react_native_1.ScrollView, { className: "flex-1", contentContainerStyle: { padding: 20, paddingBottom: 48 }, keyboardShouldPersistTaps: "handled" },
                react_1.default.createElement(react_native_1.View, { className: "items-center mb-6" },
                    react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: logoUploading ? undefined : pickLogo, disabled: logoUploading, className: "w-24 h-24 rounded-2xl border-2 border-slate-200 bg-slate-50 items-center justify-center overflow-hidden" }, logoDataUrl ? (react_1.default.createElement(react_native_1.Image, { source: { uri: logoDataUrl }, className: "w-full h-full", resizeMode: "cover" })) : logoUploading ? (react_1.default.createElement(react_native_1.ActivityIndicator, { size: "large", color: "#e67e22" })) : (react_1.default.createElement(react_native_1.View, { className: "items-center" },
                        react_1.default.createElement(vector_icons_1.Ionicons, { name: "business", size: 36, color: "#94a3b8" })))),
                    react_1.default.createElement(react_native_1.Text, { className: "text-sm font-medium text-slate-500 mt-2" }, "Upload company logo")),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Business / Company Name"),
                react_1.default.createElement(react_native_1.TextInput, { value: companyName, onChangeText: setCompanyName, placeholder: "Enter business name", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8" }),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Trade / Brand Name"),
                react_1.default.createElement(react_native_1.TextInput, { value: tradeName, onChangeText: setTradeName, placeholder: "Optional", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8" }),
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-2" },
                    react_1.default.createElement(react_native_1.Text, { className: LABEL }, "GST Registered"),
                    react_1.default.createElement(react_native_1.Switch, { value: gstEnabled, onValueChange: setGstEnabled, trackColor: { false: "#cbd5e1", true: "#e67e22" }, thumbColor: "#fff" })),
                gstEnabled && (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "GSTIN"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2 mb-4" },
                        react_1.default.createElement(react_native_1.TextInput, { value: gstin, onChangeText: setGstin, placeholder: "15-digit GSTIN", className: `flex-1 ${INPUT}`, placeholderTextColor: "#94a3b8", maxLength: 15 }),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { className: "bg-slate-100 px-4 py-3 rounded-xl items-center justify-center" },
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro }, "Fetch"))))),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Business Phone"),
                react_1.default.createElement(react_native_1.TextInput, { value: phone, onChangeText: setPhone, placeholder: "Phone number", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", keyboardType: "phone-pad" }),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Business Email"),
                react_1.default.createElement(react_native_1.TextInput, { value: email, onChangeText: setEmail, placeholder: "Email", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", keyboardType: "email-address" }),
                react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between mb-2" },
                    react_1.default.createElement(react_native_1.Text, { className: LABEL }, "Billing Address"),
                    react_1.default.createElement(react_native_1.View, { className: "flex-row gap-2" },
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: shareAddress, className: "flex-row items-center gap-1" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "share-outline", size: 16, color: "#64748b" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro }, "Share")),
                        react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: copyToShipping, className: "flex-row items-center gap-1" },
                            react_1.default.createElement(vector_icons_1.Ionicons, { name: "copy-outline", size: 16, color: "#64748b" }),
                            react_1.default.createElement(react_native_1.Text, { className: typography_1.TYPO.micro }, "Copy to Shipping")))),
                react_1.default.createElement(react_native_1.TextInput, { value: billingAddress, onChangeText: setBillingAddress, placeholder: "Full billing address", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", multiline: true, numberOfLines: 3 }),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Shipping Address"),
                react_1.default.createElement(react_native_1.TextInput, { value: shippingAddress, onChangeText: setShippingAddress, placeholder: "Same as billing or different", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", multiline: true, numberOfLines: 3 }),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Bank Account Holder"),
                react_1.default.createElement(react_native_1.TextInput, { value: bankAccountHolder, onChangeText: setBankAccountHolder, placeholder: "Account holder name", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8" }),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Bank Name"),
                react_1.default.createElement(react_native_1.TextInput, { value: bankName, onChangeText: setBankName, placeholder: "e.g. State Bank of India", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8" }),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Account Number"),
                react_1.default.createElement(react_native_1.TextInput, { value: bankAccountNo, onChangeText: setBankAccountNo, placeholder: "Bank account number", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", keyboardType: "numeric" }),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "IFSC (Branch)"),
                react_1.default.createElement(react_native_1.TextInput, { value: bankIfsc, onChangeText: (t) => setBankIfsc(t.toUpperCase()), placeholder: "e.g. SBIN0001234", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", autoCapitalize: "characters", maxLength: 11 }),
                react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Business Type"),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setBusinessTypeModalOpen(true), className: `${INPUT} mb-4 flex-row items-center justify-between` },
                    react_1.default.createElement(react_native_1.Text, { className: businessType ? "text-base font-medium text-slate-800" : "text-slate-400" }, businessType || "Select business type"),
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "chevron-down", size: 20, color: "#94a3b8" })),
                react_1.default.createElement(react_native_1.Modal, { visible: businessTypeModalOpen, transparent: true, animationType: "slide" },
                    react_1.default.createElement(react_native_1.Pressable, { className: "flex-1 bg-black/50 justify-end", onPress: () => setBusinessTypeModalOpen(false) },
                        react_1.default.createElement(react_native_1.Pressable, { onPress: (e) => e.stopPropagation(), className: "bg-white rounded-t-2xl max-h-[70%]" },
                            react_1.default.createElement(react_native_1.View, { className: "flex-row items-center justify-between px-4 py-3 border-b border-slate-100" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-lg font-semibold text-slate-800" }, "Business Type"),
                                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setBusinessTypeModalOpen(false) },
                                    react_1.default.createElement(vector_icons_1.Ionicons, { name: "close", size: 24, color: "#64748b" }))),
                            react_1.default.createElement(react_native_1.ScrollView, { className: "max-h-80", keyboardShouldPersistTaps: "handled" }, BUSINESS_TYPES.map((t) => (react_1.default.createElement(react_native_1.TouchableOpacity, { key: t, onPress: () => {
                                    setBusinessType(t);
                                    setBusinessTypeModalOpen(false);
                                }, className: "flex-row items-center justify-between px-4 py-3.5 border-b border-slate-50" },
                                react_1.default.createElement(react_native_1.Text, { className: "text-base font-medium text-slate-800" }, t),
                                businessType === t && (react_1.default.createElement(vector_icons_1.Ionicons, { name: "checkmark-circle", size: 22, color: "#e67e22" }))))))))),
                react_1.default.createElement(react_native_1.TouchableOpacity, { onPress: () => setShowOptional(!showOptional), className: "flex-row items-center gap-2 mb-4" },
                    react_1.default.createElement(vector_icons_1.Ionicons, { name: showOptional ? "chevron-down" : "chevron-forward", size: 18, color: "#64748b" }),
                    react_1.default.createElement(react_native_1.Text, { className: LABEL }, "Optional fields")),
                showOptional && (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "PAN"),
                    react_1.default.createElement(react_native_1.TextInput, { value: pan, onChangeText: setPan, placeholder: "10-char PAN", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", maxLength: 10 }),
                    react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Alternate Contact"),
                    react_1.default.createElement(react_native_1.TextInput, { value: altContact, onChangeText: setAltContact, placeholder: "Alternate phone", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", keyboardType: "phone-pad" }),
                    react_1.default.createElement(react_native_1.Text, { className: `${LABEL} mb-2` }, "Website"),
                    react_1.default.createElement(react_native_1.TextInput, { value: website, onChangeText: setWebsite, placeholder: "https://...", className: `${INPUT} mb-4`, placeholderTextColor: "#94a3b8", keyboardType: "url" })))))));
}
//# sourceMappingURL=CompanyProfileScreen.js.map