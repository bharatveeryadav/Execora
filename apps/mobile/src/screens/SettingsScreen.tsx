/**
 * SettingsScreen — app settings (per Sprint 13).
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";

export function SettingsScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-slate-100">
        <Text className="text-xl font-bold text-slate-800">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-sm font-semibold text-slate-500 uppercase mb-2">Profile</Text>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate("CompanyProfile")}
          className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4"
        >
          <Text className="font-medium text-slate-800">Business Profile</Text>
          <Text className="text-sm text-slate-500">Company name, GSTIN, address</Text>
        </TouchableOpacity>

        <Text className="text-sm font-semibold text-slate-500 uppercase mb-2">General</Text>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate("SettingsThermal")}
          className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-2"
        >
          <Text className="font-medium text-slate-800">Thermal Print</Text>
          <Text className="text-sm text-slate-500">58mm/80mm receipt, header, footer</Text>
        </TouchableOpacity>
        <TouchableOpacity className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-2">
          <Text className="font-medium text-slate-800">Invoice Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
          <Text className="font-medium text-slate-800">Theme</Text>
          <Text className="text-sm text-slate-500">Light / Dark / System</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="p-4 bg-red-50 rounded-xl border border-red-100 mt-4"
        >
          <Text className="font-semibold text-red-600">Logout</Text>
        </TouchableOpacity>

        <Text className="text-xs text-slate-400 text-center mt-8">Execora v0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
