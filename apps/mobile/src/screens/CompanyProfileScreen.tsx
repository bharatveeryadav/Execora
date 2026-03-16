/**
 * CompanyProfileScreen — Edit business/company details.
 * Business name, GST, address, shipping, optional fields, business type.
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { authApi, authExtApi } from "../lib/api";
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

export function CompanyProfileScreen() {
  const navigation = useNavigation();
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
    }
  }, [tenant, settings]);

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
      <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e67e22" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
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
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Business / Company name */}
          <Text className={`${TYPO.label} mb-1`}>Business / Company Name</Text>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter business name"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
          />

          {/* Trade or Brand name */}
          <Text className={`${TYPO.label} mb-1`}>Trade / Brand Name</Text>
          <TextInput
            value={tradeName}
            onChangeText={setTradeName}
            placeholder="Optional"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
          />

          {/* GST toggle */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className={TYPO.label}>GST Registered</Text>
            <Switch value={gstEnabled} onValueChange={setGstEnabled} trackColor={{ false: "#cbd5e1", true: "#e67e22" }} thumbColor="#fff" />
          </View>
          {gstEnabled && (
            <>
              <Text className={`${TYPO.label} mb-1`}>GSTIN</Text>
              <View className="flex-row gap-2 mb-4">
                <TextInput
                  value={gstin}
                  onChangeText={setGstin}
                  placeholder="15-digit GSTIN"
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-3"
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
          <Text className={`${TYPO.label} mb-1`}>Business Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />
          <Text className={`${TYPO.label} mb-1`}>Business Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
          />

          {/* Billing Address */}
          <View className="flex-row items-center justify-between mb-1">
            <Text className={TYPO.label}>Billing Address</Text>
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
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />

          {/* Shipping Address */}
          <Text className={`${TYPO.label} mb-1`}>Shipping Address</Text>
          <TextInput
            value={shippingAddress}
            onChangeText={setShippingAddress}
            placeholder="Same as billing or different"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />

          {/* Bank Account Details */}
          <Text className={`${TYPO.label} mb-1`}>Bank Account Holder</Text>
          <TextInput
            value={bankAccountHolder}
            onChangeText={setBankAccountHolder}
            placeholder="Account holder name"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
          />
          <Text className={`${TYPO.label} mb-1`}>Bank Name</Text>
          <TextInput
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. State Bank of India"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
          />
          <Text className={`${TYPO.label} mb-1`}>Account Number</Text>
          <TextInput
            value={bankAccountNo}
            onChangeText={setBankAccountNo}
            placeholder="Bank account number"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />
          <Text className={`${TYPO.label} mb-1`}>IFSC (Branch)</Text>
          <TextInput
            value={bankIfsc}
            onChangeText={(t) => setBankIfsc(t.toUpperCase())}
            placeholder="e.g. SBIN0001234"
            className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            maxLength={11}
          />

          {/* Business Type */}
          <Text className={`${TYPO.label} mb-1`}>Business Type</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {BUSINESS_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setBusinessType(businessType === t ? "" : t)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: businessType === t ? "#e67e22" : "#e2e8f0", backgroundColor: businessType === t ? "#fff5f0" : "#f8fafc" }}
              >
                <Text className={`text-xs ${businessType === t ? "text-primary font-semibold" : "text-slate-600"}`}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Optional fields toggle */}
          <TouchableOpacity
            onPress={() => setShowOptional(!showOptional)}
            className="flex-row items-center gap-2 mb-4"
          >
            <Ionicons name={showOptional ? "chevron-down" : "chevron-forward"} size={18} color="#64748b" />
            <Text className={TYPO.label}>Optional fields</Text>
          </TouchableOpacity>
          {showOptional && (
            <>
              <Text className={`${TYPO.label} mb-1`}>PAN</Text>
              <TextInput
                value={pan}
                onChangeText={setPan}
                placeholder="10-char PAN"
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
                placeholderTextColor="#94a3b8"
                maxLength={10}
              />
              <Text className={`${TYPO.label} mb-1`}>Alternate Contact</Text>
              <TextInput
                value={altContact}
                onChangeText={setAltContact}
                placeholder="Alternate phone"
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
              <Text className={`${TYPO.label} mb-1`}>Website</Text>
              <TextInput
                value={website}
                onChangeText={setWebsite}
                placeholder="https://..."
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4"
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
