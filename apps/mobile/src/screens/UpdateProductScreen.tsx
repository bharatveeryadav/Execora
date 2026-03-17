/**
 * UpdateProductScreen — Full form for editing product details.
 * Navigated from ProductDetailScreen on double-tap of any field.
 * Layout: Add Custom Fields, Product Details, Units, Optional Fields, Update Product button.
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi, apiFetch } from "@execora/shared";
import * as ImagePicker from "expo-image-picker";
import { getApiBaseUrl } from "../lib/api";
import { tokenStorage } from "../lib/storage";
import { Ionicons } from "@expo/vector-icons";
import { BarcodeScanner } from "../components/common/BarcodeScanner";

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

function num(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isFinite(n) ? n : 0;
}

export function UpdateProductScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();
  const params = route.params as { id?: string; product?: Record<string, unknown> } | undefined;
  const id = params?.id ?? "";
  const passedProduct = params?.product;

  const [type, setType] = useState<"product" | "service">("product");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("piece");
  const [category, setCategory] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [minStock, setMinStock] = useState("");
  const [isFeatured, setIsFeatured] = useState(true);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [optionalExpanded, setOptionalExpanded] = useState(true);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productApi.get(id),
    enabled: !!id,
    retry: false,
  });

  const fetchedProduct = data?.product as Record<string, unknown> | undefined;
  const product = (fetchedProduct ?? passedProduct) as Record<string, unknown> | undefined;

  useEffect(() => {
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
      setIsFeatured((product.isFeatured as boolean) ?? true);
    }
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<{ product: unknown }>(`/api/v1/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["product", id] });
      Alert.alert("", "Product updated", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e: Error) => {
      Alert.alert("Error", e.message ?? "Update failed");
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      formData.append("file", { uri, type: "image/jpeg", name: "image.jpg" } as any);
      const token = tokenStorage.getToken();
      const res = await fetch(`${getApiBaseUrl()}/api/v1/products/${id}/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["product", id] });
      void qc.invalidateQueries({ queryKey: ["products"] });
      Alert.alert("", "Image uploaded");
    },
    onError: () => Alert.alert("Error", "Image upload failed"),
  });

  const handleUpdate = () => {
    const payload: Record<string, unknown> = {};
    if (name.trim()) payload.name = name.trim();
    const p = parseFloat(price);
    if (!isNaN(p) && p >= 0) payload.price = p;
    const g = parseFloat(gstRate);
    if (!isNaN(g) && g >= 0) payload.gstRate = g;
    const c = parseFloat(cost);
    if (!isNaN(c) && c >= 0) payload.cost = c;
    const s = parseInt(stock, 10);
    if (!isNaN(s) && s >= 0) payload.stock = s;
    payload.unit = unit || "piece";
    payload.category = category.trim() || "general";
    payload.hsnCode = hsnCode.trim() || "";
    payload.barcode = barcode.trim() || "";
    payload.description = description.trim() || "";
    const m = parseInt(minStock, 10);
    if (!isNaN(m) && m >= 0) payload.minStock = m;
    payload.isFeatured = isFeatured;
    updateMutation.mutate(payload);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to photos to add product image.");
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
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-600">No product selected</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-primary px-6 py-2 rounded-xl">
            <Text className="text-white font-semibold">Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !passedProduct) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-600">Product not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-primary px-6 py-2 rounded-xl">
            <Text className="text-white font-semibold">Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if ((isLoading || !product) && !passedProduct) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#e67e22" />
          <Text className="mt-2 text-slate-500">Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayUnit = (unit === "kg" || unit === "KGS" ? "KGS" : unit).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">Update Product</Text>
        <TouchableOpacity
          onPress={() => Alert.alert("Product Settings", "Coming soon")}
          className="p-2"
        >
          <Ionicons name="cube-outline" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Add Custom Fields banner */}
          <TouchableOpacity
            onPress={() => Alert.alert("Custom Fields", "Coming soon")}
            className="mx-4 mt-3 flex-row items-center justify-between rounded-xl bg-sky-100 px-4 py-3"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name="add-circle-outline" size={20} color="#0284c7" />
              <View>
                <Text className="text-sm font-bold text-slate-800">Add Custom Fields</Text>
                <Text className="text-xs text-slate-600">Personalize to perfectly suit your style.</Text>
              </View>
            </View>
            <Ionicons name="headset-outline" size={22} color="#64748b" />
          </TouchableOpacity>

          {/* Product Details */}
          <View className="mx-4 mt-4 rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <Text className="text-base font-bold text-slate-800 px-4 pt-4 pb-3">Product Details</Text>

            {/* Type: Product / Service */}
            <View className="px-4 py-3 border-t border-slate-100 flex-row items-center gap-6">
              <TouchableOpacity
                onPress={() => setType("product")}
                className="flex-row items-center gap-2"
              >
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${type === "product" ? "border-primary bg-primary" : "border-slate-300"}`}>
                  {type === "product" && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
                <Text className="text-sm font-medium text-slate-800">Product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setType("service")}
                className="flex-row items-center gap-2"
              >
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${type === "service" ? "border-primary bg-primary" : "border-slate-300"}`}>
                  {type === "service" && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
                <Text className="text-sm font-medium text-slate-800">Service</Text>
              </TouchableOpacity>
            </View>

            {/* Product Name */}
            <FormField label="Product Name*" value={name} onChangeText={setName} placeholder="Enter name" />

            {/* Selling Price */}
            <View className="px-4 py-3 border-t border-slate-100">
              <Text className="text-xs text-slate-500 mb-1">Selling price</Text>
              <Text className="text-[10px] text-slate-400 mb-1">Inclusive of taxes</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-base"
              />
            </View>

            {/* Tax Rate */}
            <View className="px-4 py-3 border-t border-slate-100">
              <Text className="text-xs text-slate-500 mb-1">Tax rate %</Text>
              <TextInput
                value={gstRate}
                onChangeText={setGstRate}
                placeholder="0.0"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-base"
              />
              <TouchableOpacity className="flex-row items-center gap-1 mt-2">
                <Ionicons name="add" size={14} color="#2563eb" />
                <Text className="text-sm text-blue-600">Enter GSTIN to add/change Tax</Text>
              </TouchableOpacity>
            </View>

            {/* Purchase Price */}
            <View className="px-4 py-3 border-t border-slate-100">
              <Text className="text-xs text-slate-500 mb-1">Purchase Price</Text>
              <Text className="text-[10px] text-slate-400 mb-1">Inclusive of taxes</Text>
              <TextInput
                value={cost}
                onChangeText={setCost}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-base"
              />
            </View>
          </View>

          {/* Units */}
          <View className="mx-4 mt-4 rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
              <Text className="text-base font-bold text-slate-800">Units</Text>
              <TouchableOpacity onPress={() => Alert.alert("Add Alternative Unit", "Coming soon")}>
                <Text className="text-sm font-semibold text-blue-600">Add Alternative Unit</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setShowUnitPicker(true)}
              className="px-4 py-3 border-t border-slate-100 flex-row items-center justify-between"
            >
              <Text className="text-sm text-slate-500">Select Unit</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-medium text-slate-800">{displayUnit}</Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Optional Fields (collapsible) */}
          <TouchableOpacity
            onPress={() => setOptionalExpanded(!optionalExpanded)}
            className="mx-4 mt-4 rounded-2xl bg-white border border-slate-200 overflow-hidden"
          >
            <View className="px-4 py-4 flex-row items-center justify-between">
              <Text className="text-base font-bold text-slate-800">Optional Fields</Text>
              <Ionicons name={optionalExpanded ? "chevron-up" : "chevron-down"} size={22} color="#64748b" />
            </View>
            <Text className="px-4 pb-3 text-xs text-slate-500">Description, Barcode, Category, Product Images</Text>

            {optionalExpanded && (
              <View className="border-t border-slate-100">
                <FormField label="HSN Code" value={hsnCode} onChangeText={setHsnCode} placeholder="Select HSN Code" />
                <FormField label="Category" value={category} onChangeText={setCategory} placeholder="Select Category" />
                <View className="px-4 py-3 border-t border-slate-100">
                  <Text className="text-xs text-slate-500 mb-1">Description</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Add Description"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm"
                  />
                </View>
                <View className="px-4 py-3 border-t border-slate-100">
                  <Text className="text-xs text-slate-500 mb-1">Barcode</Text>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={barcode}
                      onChangeText={setBarcode}
                      placeholder="Add Barcode"
                      placeholderTextColor="#94a3b8"
                      className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm"
                    />
                    <TouchableOpacity
                      onPress={() => setShowBarcodeScanner(true)}
                      className="p-2.5 rounded-lg bg-slate-100"
                    >
                      <Ionicons name="barcode-outline" size={24} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={pickImage}
                  className="px-4 py-3 border-t border-slate-100 flex-row items-center justify-between"
                >
                  <Text className="text-sm text-slate-500">Product Images</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-slate-600">Add Product Images</Text>
                    <Ionicons name="chevron-forward" size={18} color="#64748b" />
                  </View>
                </TouchableOpacity>
                <View className="px-4 py-3 border-t border-slate-100 flex-row items-center justify-between">
                  <Text className="text-sm text-slate-700">Show in online store</Text>
                  <Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{ false: "#cbd5e1", true: "#e67e22" }} thumbColor="#fff" />
                </View>
                <FormField label="Low Stock Alert at" value={minStock} onChangeText={setMinStock} placeholder="0" keyboardType="number-pad" />
              </View>
            )}
          </TouchableOpacity>

          {/* Update Product button */}
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={updateMutation.isPending}
            className="mx-4 mt-6 mb-8 flex-row items-center justify-center gap-2 bg-primary py-4 rounded-xl"
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Update Product</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Unit picker modal */}
      <Modal visible={showUnitPicker} transparent animationType="slide">
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowUnitPicker(false)}>
          <View className="bg-white rounded-t-3xl max-h-[60%]">
            <View className="w-10 h-1 rounded-full bg-slate-200 self-center mt-3 mb-4" />
            <Text className="text-lg font-bold px-5 mb-3">Select unit</Text>
            <ScrollView className="max-h-64 px-5 pb-8">
              {UNITS.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => {
                    setUnit(u);
                    setShowUnitPicker(false);
                  }}
                  className="py-3.5 border-b border-slate-100 flex-row items-center justify-between"
                >
                  <Text className="text-base text-slate-800">{u}</Text>
                  {unit === u && <Ionicons name="checkmark" size={20} color="#e67e22" />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <BarcodeScanner
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(code) => {
          setBarcode(code);
          setShowBarcodeScanner(false);
        }}
      />
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad" | "number-pad";
}) {
  return (
    <View className="px-4 py-3 border-t border-slate-100">
      <Text className="text-xs text-slate-500 mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-base"
      />
    </View>
  );
}
