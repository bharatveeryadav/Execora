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
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { authApi, authExtApi, getApiBaseUrl } from "../lib/api";
import { tokenStorage } from "../lib/storage";
import { TYPO } from "../lib/typography";

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
const INPUT = "border border-slate-200 rounded-xl px-4 py-3.5 text-base text-slate-800";

type Props = NativeStackScreenProps<import("../navigation").MoreStackParams, "CompanyProfile">;

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
  const [businessTypeModalOpen, setBusinessTypeModalOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

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
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);
          if (!cancelled) setLogoDataUrl(`data:image/jpeg;base64,${base64}`);
        } catch {
          /* base64 conversion failed */
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [logoObjectKey]);

  useEffect(() => {
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
      setLogoObjectKey((settings.logoObjectKey as string) ?? null);
    }
  }, [tenant, settings]);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to photos to upload your logo.");
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
      const { logoObjectKey: key } = await authExtApi.uploadLogo(uri, mimeType ?? "image/jpeg");
      setLogoObjectKey(key);
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
      Alert.alert("", "Logo uploaded successfully");
    } catch (e) {
      Alert.alert("Upload failed", (e as Error).message ?? "Please try again.");
    } finally {
      setLogoUploading(false);
    }
  };

  const updateProfile = useMutation({
    mutationFn: (data: Parameters<typeof authExtApi.updateProfile>[0]) =>
      authExtApi.updateProfile(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["auth", "me"] });
      Alert.alert("", "Company details saved ✅");
    },
    onError: (e: Error) => Alert.alert("Error", e.message ?? "Failed to save"),
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text className={TYPO.sectionTitle}>Company Details</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateProfile.isPending}
            className="bg-primary px-4 py-2 rounded-lg"
          >
            {updateProfile.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="font-semibold text-white">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Company logo — top middle */}
          <View className="items-center mb-6">
            <TouchableOpacity
              onPress={logoUploading ? undefined : pickLogo}
              disabled={logoUploading}
              className="w-24 h-24 rounded-2xl border-2 border-slate-200 bg-slate-50 items-center justify-center overflow-hidden"
            >
              {logoDataUrl ? (
                <Image source={{ uri: logoDataUrl }} className="w-full h-full" resizeMode="cover" />
              ) : logoUploading ? (
                <ActivityIndicator size="large" color="#e67e22" />
              ) : (
                <View className="items-center">
                  <Ionicons name="business" size={36} color="#94a3b8" />
                </View>
              )}
            </TouchableOpacity>
            <Text className="text-sm font-medium text-slate-500 mt-2">Upload company logo</Text>
          </View>

          {/* Business / Company name */}
          <Text className={`${LABEL} mb-2`}>Business / Company Name</Text>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter business name"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
          />

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
            <Switch value={gstEnabled} onValueChange={setGstEnabled} trackColor={{ false: "#cbd5e1", true: "#e67e22" }} thumbColor="#fff" />
          </View>
          {gstEnabled && (
            <>
              <Text className={`${LABEL} mb-2`}>GSTIN</Text>
              <View className="flex-row gap-2 mb-4">
                <TextInput
                  value={gstin}
                  onChangeText={setGstin}
                  placeholder="15-digit GSTIN"
                  className={`flex-1 ${INPUT}`}
                  placeholderTextColor="#94a3b8"
                  maxLength={15}
                />
                <TouchableOpacity className="bg-slate-100 px-4 py-3 rounded-xl items-center justify-center">
                  <Text className={TYPO.micro}>Fetch</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Phone & Email */}
          <Text className={`${LABEL} mb-2`}>Business Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />
          <Text className={`${LABEL} mb-2`}>Business Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
          />

          {/* Billing Address */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className={LABEL}>Billing Address</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={shareAddress} className="flex-row items-center gap-1">
                <Ionicons name="share-outline" size={16} color="#64748b" />
                <Text className={TYPO.micro}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={copyToShipping} className="flex-row items-center gap-1">
                <Ionicons name="copy-outline" size={16} color="#64748b" />
                <Text className={TYPO.micro}>Copy to Shipping</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            value={billingAddress}
            onChangeText={setBillingAddress}
            placeholder="Full billing address"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />

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
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />
          <Text className={`${LABEL} mb-2`}>IFSC (Branch)</Text>
          <TextInput
            value={bankIfsc}
            onChangeText={(t) => setBankIfsc(t.toUpperCase())}
            placeholder="e.g. SBIN0001234"
            className={`${INPUT} mb-4`}
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            maxLength={11}
          />

          {/* Business Type */}
          <Text className={`${LABEL} mb-2`}>Business Type</Text>
          <TouchableOpacity
            onPress={() => setBusinessTypeModalOpen(true)}
            className={`${INPUT} mb-4 flex-row items-center justify-between`}
          >
            <Text className={businessType ? "text-base font-medium text-slate-800" : "text-slate-400"}>
              {businessType || "Select business type"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <Modal visible={businessTypeModalOpen} transparent animationType="slide">
            <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setBusinessTypeModalOpen(false)}>
              <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-2xl max-h-[70%]">
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
                  <Text className="text-lg font-semibold text-slate-800">Business Type</Text>
                  <TouchableOpacity onPress={() => setBusinessTypeModalOpen(false)}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <ScrollView className="max-h-80" keyboardShouldPersistTaps="handled">
                  {BUSINESS_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        setBusinessType(t);
                        setBusinessTypeModalOpen(false);
                      }}
                      className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-50"
                    >
                      <Text className="text-base font-medium text-slate-800">{t}</Text>
                      {businessType === t && (
                        <Ionicons name="checkmark-circle" size={22} color="#e67e22" />
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
            <Ionicons name={showOptional ? "chevron-down" : "chevron-forward"} size={18} color="#64748b" />
            <Text className={LABEL}>Optional fields</Text>
          </TouchableOpacity>
          {showOptional && (
            <>
              <Text className={`${LABEL} mb-2`}>PAN</Text>
              <TextInput
                value={pan}
                onChangeText={setPan}
                placeholder="10-char PAN"
                className={`${INPUT} mb-4`}
                placeholderTextColor="#94a3b8"
                maxLength={10}
              />
              <Text className={`${LABEL} mb-2`}>Alternate Contact</Text>
              <TextInput
                value={altContact}
                onChangeText={setAltContact}
                placeholder="Alternate phone"
                className={`${INPUT} mb-4`}
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
              <Text className={`${LABEL} mb-2`}>Website</Text>
              <TextInput
                value={website}
                onChangeText={setWebsite}
                placeholder="https://..."
                className={`${INPUT} mb-4`}
                placeholderTextColor="#94a3b8"
                keyboardType="url"
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
