/**
 * CompanyProfileScreen — Edit business/company details.
 * Logo upload, business name, GST, address, bank, business type (modal picker).
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Share,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { showAlert } from "../../../lib/alerts";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { getGstinValidationError } from "@execora/shared";
import { authApi, authExtApi, getApiBaseUrl } from "../../../lib/api";
import { tokenStorage } from "../../../lib/storage";
import { TYPO } from "../../../lib/typography";

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

type MeUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  tenant?: {
    id: string;
    name?: string;
    legalName?: string;
    tradeName?: string;
    gstin?: string;
    gstRegistered?: boolean;
    state?: string;
    settings?: Record<string, string | boolean>;
  };
};

const LABEL = "text-sm font-medium text-slate-600";
const INPUT =
  "border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-800";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
};

type ProfileComparableState = {
  companyName: string;
  tradeName: string;
  gstEnabled: boolean;
  gstin: string;
  phone: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  businessType: string;
  pan: string;
  altContact: string;
  website: string;
  bankAccountHolder: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  logoObjectKey: string;
};

function normalizeComparableState(state: ProfileComparableState): ProfileComparableState {
  return {
    companyName: state.companyName.trim(),
    tradeName: state.tradeName.trim(),
    gstEnabled: state.gstEnabled,
    gstin: state.gstin.trim().toUpperCase(),
    phone: state.phone.replace(/\D/g, ""),
    email: state.email.trim().toLowerCase(),
    billingAddress: state.billingAddress.trim(),
    shippingAddress: state.shippingAddress.trim(),
    businessType: state.businessType.trim(),
    pan: state.pan.trim().toUpperCase(),
    altContact: state.altContact.replace(/\D/g, ""),
    website: state.website.trim(),
    bankAccountHolder: state.bankAccountHolder.trim(),
    bankName: state.bankName.trim(),
    bankAccountNo: state.bankAccountNo.trim(),
    bankIfsc: state.bankIfsc.trim().toUpperCase(),
    logoObjectKey: state.logoObjectKey.trim(),
  };
}

function isValidWebsite(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  try {
    const url = v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
    const parsed = new URL(url);
    return !!parsed.hostname && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

type Props = NativeStackScreenProps<
  import("../../../navigation").MoreStackParams,
  "CompanyProfile"
>;

export function CompanyProfileScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const { data: meData, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me(),
    staleTime: 0,
  });
  const user = (meData?.user ?? {}) as MeUser;
  const tenant = user?.tenant;
  const settings = (tenant?.settings ?? {}) as Record<string, string | boolean>;
  const loadedProfileState = normalizeComparableState({
    companyName: tenant?.legalName ?? tenant?.name ?? "",
    tradeName: tenant?.tradeName ?? "",
    gstEnabled: Boolean(tenant?.gstin),
    gstin: tenant?.gstin ?? "",
    phone: String(settings.phone ?? ""),
    email: String(settings.email ?? ""),
    billingAddress: String(settings.billingAddress ?? settings.address ?? ""),
    shippingAddress: String(settings.shippingAddress ?? ""),
    businessType: String(settings.businessType ?? ""),
    pan: String(settings.pan ?? ""),
    altContact: String(settings.altContact ?? ""),
    website: String(settings.website ?? ""),
    bankAccountHolder: String(settings.bankAccountHolder ?? ""),
    bankName: String(settings.bankName ?? ""),
    bankAccountNo: String(settings.bankAccountNo ?? ""),
    bankIfsc: String(settings.bankIfsc ?? ""),
    logoObjectKey: String(settings.logoObjectKey ?? ""),
  });

  const [companyName, setCompanyName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [pan, setPan] = useState("");
  const [altContact, setAltContact] = useState("");
  const [website, setWebsite] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [logoObjectKey, setLogoObjectKey] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [gstError, setGstError] = useState<string | null>(null);
  const [gstStateHint, setGstStateHint] = useState<string | null>(null);
  const [gstPanHint, setGstPanHint] = useState<string | null>(null);
  const [businessTypeModalOpen, setBusinessTypeModalOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const normalizedGstin = gstin.trim().toUpperCase();
  const phoneDigits = phone.replace(/\D/g, "").trim();
  const altContactDigits = altContact.replace(/\D/g, "").trim();
  const emailTrimmed = email.trim();
  const panUpper = pan.trim().toUpperCase();
  const bankIfscUpper = bankIfsc.trim().toUpperCase();
  const websiteTrimmed = website.trim();
  const normalizedWebsite =
    websiteTrimmed &&
    !(websiteTrimmed.startsWith("http://") || websiteTrimmed.startsWith("https://"))
      ? `https://${websiteTrimmed}`
      : websiteTrimmed;

  const companyNameError = companyName.trim() ? null : "Business name is required";
  const billingAddressError = billingAddress.trim()
    ? null
    : "Billing address is required";
  const businessPhoneError =
    phone.trim() && phoneDigits.length !== 10
      ? "Enter a valid 10-digit business phone"
      : null;
  const altContactError =
    altContact.trim() && altContactDigits.length !== 10
      ? "Alternate contact must be a 10-digit number"
      : null;
  const emailError =
    emailTrimmed && !EMAIL_REGEX.test(emailTrimmed)
      ? "Enter a valid business email"
      : null;
  const panError =
    panUpper && !PAN_REGEX.test(panUpper) ? "PAN format should be ABCDE1234F" : null;
  const ifscError =
    bankIfscUpper && !IFSC_REGEX.test(bankIfscUpper)
      ? "IFSC format should be like SBIN0001234"
      : null;
  const bankAccountError =
    bankAccountNo.trim() && !/^\d{6,18}$/.test(bankAccountNo.trim())
      ? "Account number should be 6-18 digits"
      : null;
  const websiteError =
    websiteTrimmed && !isValidWebsite(websiteTrimmed)
      ? "Enter a valid website URL"
      : null;
  const gstValidationError = gstEnabled
    ? normalizedGstin
      ? getGstinValidationError(normalizedGstin)
      : "GSTIN is required when GST is enabled"
    : null;
  const effectiveGstError = gstError ?? gstValidationError;
  const saveBlockedReason =
    companyNameError ||
    billingAddressError ||
    effectiveGstError ||
    businessPhoneError ||
    altContactError ||
    emailError ||
    panError ||
    ifscError ||
    bankAccountError ||
    websiteError;
  const hasValidationErrors = Boolean(saveBlockedReason);
  const hasUnsavedChanges =
    JSON.stringify(
      normalizeComparableState({
        companyName,
        tradeName,
        gstEnabled,
        gstin,
        phone,
        email,
        billingAddress,
        shippingAddress,
        businessType,
        pan,
        altContact,
        website,
        bankAccountHolder,
        bankName,
        bankAccountNo,
        bankIfsc,
        logoObjectKey: logoObjectKey ?? "",
      }),
    ) !== JSON.stringify(loadedProfileState);

  useEffect(() => {
    if (!logoObjectKey) {
      setLogoDataUrl(null);
      return;
    }
    const token = tokenStorage.getToken();
    if (!token) return;
    let cancelled = false;
    fetch(`${getApiBaseUrl()}/api/v1/tenant/logo`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((arrayBuffer) => {
        if (cancelled || !arrayBuffer) return;
        try {
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++)
            binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);
          if (!cancelled) setLogoDataUrl(`data:image/jpeg;base64,${base64}`);
        } catch {
          /* base64 conversion failed */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [logoObjectKey]);

  useEffect(() => {
    if (tenant) {
      setCompanyName(tenant.legalName ?? tenant.name ?? "");
      setTradeName(tenant.tradeName ?? "");
      setGstEnabled(!!tenant.gstin);
      setGstin(tenant.gstin ?? "");
      setPhone(String(settings.phone ?? ""));
      setEmail(String(settings.email ?? ""));
      setBillingAddress(
        String(settings.billingAddress ?? settings.address ?? ""),
      );
      setShippingAddress(String(settings.shippingAddress ?? ""));
      setBusinessType(String(settings.businessType ?? ""));
      setPan(String(settings.pan ?? ""));
      setAltContact(String(settings.altContact ?? ""));
      setWebsite(String(settings.website ?? ""));
      setBankAccountHolder(String(settings.bankAccountHolder ?? ""));
      setBankName(String(settings.bankName ?? ""));
      setBankAccountNo(String(settings.bankAccountNo ?? ""));
      setBankIfsc(String(settings.bankIfsc ?? ""));
      setLogoObjectKey((settings.logoObjectKey as string) ?? null);
    }
  }, [tenant, settings]);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission needed",
        "Allow access to photos to upload your logo.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const { uri, mimeType } = result.assets[0];
    setLogoUploading(true);
    try {
      const { logoObjectKey: key } = await authExtApi.uploadLogo(
        uri,
        mimeType ?? "image/jpeg",
      );
      setLogoObjectKey(key);
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
      showAlert("", "Logo uploaded and saved successfully");
    } catch (e) {
      showAlert("Upload failed", (e as Error).message ?? "Please try again.");
    } finally {
      setLogoUploading(false);
    }
  };

  const updateProfile = useMutation({
    mutationFn: (data: Parameters<typeof authExtApi.updateProfile>[0]) =>
      authExtApi.updateProfile(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
      showAlert("", "Company details saved ✅");
    },
    onError: (e: Error) => showAlert("Error", e.message ?? "Failed to save"),
  });
  const isSaveDisabled =
    updateProfile.isPending || hasValidationErrors || !hasUnsavedChanges;

  const resetToLoadedValues = () => {
    setCompanyName(tenant?.legalName ?? tenant?.name ?? "");
    setTradeName(tenant?.tradeName ?? "");
    setGstEnabled(Boolean(tenant?.gstin));
    setGstin(tenant?.gstin ?? "");
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
    setLogoObjectKey((settings.logoObjectKey as string) ?? null);
    setGstError(null);
    setGstStateHint(null);
    setGstPanHint(null);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!hasUnsavedChanges || updateProfile.isPending) {
        return;
      }

      e.preventDefault();
      Alert.alert(
        "Discard changes?",
        "You have unsaved company profile changes. Leave without saving?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });

    return unsubscribe;
  }, [hasUnsavedChanges, navigation, updateProfile.isPending]);

  const handleBackPress = () => {
    if (!hasUnsavedChanges || updateProfile.isPending) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      "Discard changes?",
      "You have unsaved company profile changes. Leave without saving?",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const handleRemoveLogo = () => {
    Alert.alert(
      "Remove logo?",
      "This clears the current company logo. Save the profile to apply the removal.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setLogoObjectKey(null);
            setLogoDataUrl(null);
          },
        },
      ],
    );
  };

  const handleSave = () => {
    if (saveBlockedReason) {
      showAlert("Please fix details", saveBlockedReason);
      return;
    }

    if (gstEnabled) {
      const normalized = normalizedGstin;
      const err = getGstinValidationError(normalized);
      if (err) {
        setGstError(err);
        showAlert("Invalid GSTIN", err);
        return;
      }
      setGstin(normalized);
      setGstError(null);
    }

    updateProfile.mutate({
      tenant: {
        name: companyName || undefined,
        legalName: companyName || undefined,
        tradeName: tradeName || undefined,
        gstin: gstEnabled ? normalizedGstin || undefined : undefined,
        settings: {
          phone: phoneDigits || undefined,
          email: emailTrimmed || undefined,
          billingAddress: billingAddress || undefined,
          shippingAddress: shippingAddress || undefined,
          address: billingAddress || undefined,
          businessType: businessType || undefined,
          pan: panUpper || undefined,
          altContact: altContactDigits || undefined,
          website: normalizedWebsite || undefined,
          bankAccountHolder: bankAccountHolder || undefined,
          bankName: bankName || undefined,
          bankAccountNo: bankAccountNo || undefined,
          bankIfsc: bankIfscUpper || undefined,
          logoObjectKey: logoObjectKey ?? null,
        },
      },
    });
  };

  const copyToShipping = () => setShippingAddress(billingAddress);
  const handleFetchGstin = () => {
    const normalized = gstin.trim().toUpperCase();
    if (!normalized) {
      setGstError("Enter GSTIN first");
      setGstStateHint(null);
      setGstPanHint(null);
      return;
    }

    const err = getGstinValidationError(normalized);
    if (err) {
      setGstError(err);
      setGstStateHint(null);
      setGstPanHint(null);
      return;
    }

    const stateCode = normalized.slice(0, 2);
    const pan = normalized.slice(2, 12);
    const stateName = GST_STATE_CODES[stateCode] ?? `State code ${stateCode}`;

    setGstin(normalized);
    setGstError(null);
    setGstStateHint(stateName);
    setGstPanHint(pan);
    showAlert("GSTIN verified", `${stateName}\nPAN: ${pan}`);
  };

  const shareAddress = () => {
    const text = billingAddress || companyName;
    if (text) Share.share({ message: text, title: "Business Address" });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e67e22" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="px-4 py-3 border-b border-slate-100 flex-row items-center justify-between">
          <TouchableOpacity onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text className={TYPO.sectionTitle}>Company Details</Text>
          <View className="flex-row items-center gap-2">
            {hasUnsavedChanges && (
              <TouchableOpacity
                onPress={resetToLoadedValues}
                disabled={updateProfile.isPending}
                className="px-3 py-2 rounded-lg bg-slate-100"
              >
                <Text className="font-semibold text-slate-700">Reset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaveDisabled}
              className={`px-4 py-2 rounded-lg ${
                isSaveDisabled ? "bg-slate-300" : "bg-primary"
              }`}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className={`font-semibold ${isSaveDisabled ? "text-slate-500" : "text-white"}`}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {hasUnsavedChanges && (
            <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Text className="text-sm font-semibold text-amber-900">
                Unsaved changes
              </Text>
              <Text className="text-xs text-amber-700 mt-0.5">
                Review and save your business profile updates before leaving this screen.
              </Text>
            </View>
          )}

          {/* Company logo — top middle */}
          <View className="items-center mb-6">
            <TouchableOpacity
              onPress={logoUploading ? undefined : pickLogo}
              disabled={logoUploading}
              className="w-24 h-24 rounded-2xl border-2 border-slate-200 bg-slate-50 items-center justify-center overflow-hidden"
            >
              {logoDataUrl ? (
                <Image
                  source={{ uri: logoDataUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : logoUploading ? (
                <ActivityIndicator size="large" color="#e67e22" />
              ) : (
                <View className="items-center">
                  <Ionicons name="business" size={36} color="#94a3b8" />
                </View>
              )}
            </TouchableOpacity>
            <Text className="text-sm font-medium text-slate-500 mt-2">
              {logoObjectKey ? "Tap logo to replace" : "Upload company logo"}
            </Text>
            <View className="flex-row items-center gap-3 mt-3">
              <Pressable
                onPress={logoUploading ? undefined : pickLogo}
                className="px-3 py-2 rounded-lg bg-slate-100"
              >
                <Text className="text-xs font-semibold text-slate-700">
                  {logoObjectKey ? "Replace" : "Upload"}
                </Text>
              </Pressable>
              {logoObjectKey && (
                <Pressable
                  onPress={handleRemoveLogo}
                  className="px-3 py-2 rounded-lg bg-red-50 border border-red-200"
                >
                  <Text className="text-xs font-semibold text-red-700">
                    Remove
                  </Text>
                </Pressable>
              )}
            </View>
            {hasUnsavedChanges && !logoObjectKey && loadedProfileState.logoObjectKey ? (
              <Text className="text-xs text-amber-700 mt-2">
                Save to remove the current logo.
              </Text>
            ) : null}
          </View>

          {/* Business / Company name */}
          <Text className={`${LABEL} mb-2`}>Business / Company Name</Text>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter business name"
            className={`${INPUT} ${companyNameError ? "border-red-400" : ""} mb-1`}
            placeholderTextColor="#94a3b8"
          />
          {companyNameError ? (
            <Text className="text-xs text-red-600 mb-3">{companyNameError}</Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Trade or Brand name */}
          <Text className={`${LABEL} mb-2`}>Trade / Brand Name</Text>
          <TextInput
            value={tradeName}
            onChangeText={setTradeName}
            placeholder="Optional"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
          />

          {/* GST toggle */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className={LABEL}>GST Registered</Text>
            <Switch
              value={gstEnabled}
              onValueChange={setGstEnabled}
              trackColor={{ false: "#cbd5e1", true: "#e67e22" }}
              thumbColor="#fff"
            />
          </View>
          {gstEnabled && (
            <>
              <Text className={`${LABEL} mb-2`}>GSTIN</Text>
              <View className="flex-row gap-2 mb-4">
                <TextInput
                  value={gstin}
                  onChangeText={(value) => {
                    setGstin(value.toUpperCase());
                    setGstError(null);
                    setGstStateHint(null);
                    setGstPanHint(null);
                  }}
                  placeholder="15-digit GSTIN"
                  className={`flex-1 ${INPUT} ${gstError ? "border-red-400" : ""}`}
                  placeholderTextColor="#94a3b8"
                  maxLength={15}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  onPress={handleFetchGstin}
                  className="bg-slate-100 px-4 py-3 rounded-xl items-center justify-center"
                >
                  <Text className={TYPO.micro}>Fetch</Text>
                </TouchableOpacity>
              </View>
              {effectiveGstError ? (
                <Text className="text-xs text-red-600 -mt-2 mb-4">{effectiveGstError}</Text>
              ) : gstStateHint && gstPanHint ? (
                <Text className="text-xs text-emerald-700 -mt-2 mb-4">
                  State: {gstStateHint} | PAN: {gstPanHint}
                </Text>
              ) : null}
            </>
          )}

          {/* Phone & Email */}
          <Text className={`${LABEL} mb-2`}>Business Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            className={`${INPUT} ${businessPhoneError ? "border-red-400" : ""} mb-1`}
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />
          {businessPhoneError ? (
            <Text className="text-xs text-red-600 mb-3">{businessPhoneError}</Text>
          ) : (
            <View className="mb-4" />
          )}
          <Text className={`${LABEL} mb-2`}>Business Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            className={`${INPUT} ${emailError ? "border-red-400" : ""} mb-1`}
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
          />
          {emailError ? (
            <Text className="text-xs text-red-600 mb-3">{emailError}</Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Billing Address */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className={LABEL}>Billing Address</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={shareAddress}
                className="flex-row items-center gap-1"
              >
                <Ionicons name="share-outline" size={16} color="#64748b" />
                <Text className={TYPO.micro}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={copyToShipping}
                className="flex-row items-center gap-1"
              >
                <Ionicons name="copy-outline" size={16} color="#64748b" />
                <Text className={TYPO.micro}>Copy to Shipping</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            value={billingAddress}
            onChangeText={setBillingAddress}
            placeholder="Full billing address"
            className={`${INPUT} ${billingAddressError ? "border-red-400" : ""} mb-1`}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
          {billingAddressError ? (
            <Text className="text-xs text-red-600 mb-3">{billingAddressError}</Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Shipping Address */}
          <Text className={`${LABEL} mb-2`}>Shipping Address</Text>
          <TextInput
            value={shippingAddress}
            onChangeText={setShippingAddress}
            placeholder="Same as billing or different"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />

          {/* Bank Account Details */}
          <Text className={`${LABEL} mb-2`}>Bank Account Holder</Text>
          <TextInput
            value={bankAccountHolder}
            onChangeText={setBankAccountHolder}
            placeholder="Account holder name"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
          />
          <Text className={`${LABEL} mb-2`}>Bank Name</Text>
          <TextInput
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. State Bank of India"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
          />
          <Text className={`${LABEL} mb-2`}>Account Number</Text>
          <TextInput
            value={bankAccountNo}
            onChangeText={setBankAccountNo}
            placeholder="Bank account number"
            className={`${INPUT} ${bankAccountError ? "border-red-400" : ""} mb-1`}
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />
          {bankAccountError ? (
            <Text className="text-xs text-red-600 mb-3">{bankAccountError}</Text>
          ) : (
            <View className="mb-4" />
          )}
          <Text className={`${LABEL} mb-2`}>IFSC (Branch)</Text>
          <TextInput
            value={bankIfsc}
            onChangeText={(t) => setBankIfsc(t.toUpperCase())}
            placeholder="e.g. SBIN0001234"
            className={`${INPUT} ${ifscError ? "border-red-400" : ""} mb-1`}
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            maxLength={11}
          />
          {ifscError ? (
            <Text className="text-xs text-red-600 mb-3">{ifscError}</Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Business Type */}
          <Text className={`${LABEL} mb-2`}>Business Type</Text>
          <TouchableOpacity
            onPress={() => setBusinessTypeModalOpen(true)}
            className={`${INPUT} mb-4 flex-row items-center justify-between`}
          >
            <Text
              className={
                businessType
                  ? "text-base font-medium text-slate-800"
                  : "text-slate-400"
              }
            >
              {businessType || "Select business type"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <Modal
            visible={businessTypeModalOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setBusinessTypeModalOpen(false)}
          >
            <Pressable
              className="flex-1 bg-black/50 justify-end"
              onPress={() => setBusinessTypeModalOpen(false)}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                className="bg-white rounded-t-2xl max-h-[70%]"
              >
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
                  <Text className="text-lg font-semibold text-slate-800">
                    Business Type
                  </Text>
                  <TouchableOpacity
                    onPress={() => setBusinessTypeModalOpen(false)}
                  >
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  className="max-h-80"
                  keyboardShouldPersistTaps="handled"
                >
                  {BUSINESS_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        setBusinessType(t);
                        setBusinessTypeModalOpen(false);
                      }}
                      className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-50"
                    >
                      <Text className="text-base font-medium text-slate-800">
                        {t}
                      </Text>
                      {businessType === t && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#e67e22"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>

          {/* Optional fields toggle */}
          <TouchableOpacity
            onPress={() => setShowOptional(!showOptional)}
            className="flex-row items-center gap-2 mb-4"
          >
            <Ionicons
              name={showOptional ? "chevron-down" : "chevron-forward"}
              size={18}
              color="#64748b"
            />
            <Text className={LABEL}>Optional fields</Text>
          </TouchableOpacity>
          {showOptional && (
            <>
              <Text className={`${LABEL} mb-2`}>PAN</Text>
              <TextInput
                value={pan}
                onChangeText={(v) => setPan(v.toUpperCase())}
                placeholder="10-char PAN"
                className={`${INPUT} ${panError ? "border-red-400" : ""} mb-1`}
                placeholderTextColor="#94a3b8"
                maxLength={10}
              />
              {panError ? (
                <Text className="text-xs text-red-600 mb-3">{panError}</Text>
              ) : (
                <View className="mb-4" />
              )}
              <Text className={`${LABEL} mb-2`}>Alternate Contact</Text>
              <TextInput
                value={altContact}
                onChangeText={setAltContact}
                placeholder="Alternate phone"
                className={`${INPUT} ${altContactError ? "border-red-400" : ""} mb-1`}
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
              {altContactError ? (
                <Text className="text-xs text-red-600 mb-3">{altContactError}</Text>
              ) : (
                <View className="mb-4" />
              )}
              <Text className={`${LABEL} mb-2`}>Website</Text>
              <TextInput
                value={website}
                onChangeText={setWebsite}
                placeholder="https://..."
                className={`${INPUT} ${websiteError ? "border-red-400" : ""} mb-1`}
                placeholderTextColor="#94a3b8"
                keyboardType="url"
              />
              {websiteError ? (
                <Text className="text-xs text-red-600 mb-3">{websiteError}</Text>
              ) : (
                <View className="mb-4" />
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
