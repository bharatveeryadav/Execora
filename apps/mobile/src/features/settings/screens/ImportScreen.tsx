/**
 * ImportScreen — CSV import for Customers and Suppliers (mobile-friendly).
 * Flow: Choose type → Download template / Pick file → Preview → Import.
 * Uses expo-document-picker, expo-file-system, expo-sharing per Expo docs.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { showAlert } from "../../../lib/alerts";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useQueryClient } from "@tanstack/react-query";
import { customerExtApi, supplierApi } from "../../../lib/api";

type EntityType = "customers" | "suppliers";
type Step = 1 | 2 | 3 | 4;

interface ImportConfig {
  type: EntityType;
  label: string;
  columns: string[];
  example: string[][];
}

const CONFIGS: Record<EntityType, ImportConfig> = {
  customers: {
    type: "customers",
    label: "Customers",
    columns: ["Name", "Phone", "Email", "Address", "GST Number", "Opening Balance"],
    example: [
      ["Ramesh Traders", "9876543210", "ramesh@example.com", "Delhi", "07AAAAA0000A1Z5", "2500"],
      ["Suresh Kirana", "9123456780", "", "Mumbai", "", "0"],
    ],
  },
  suppliers: {
    type: "suppliers",
    label: "Suppliers",
    columns: ["Name", "Company Name", "Phone", "Email", "Address", "GSTIN"],
    example: [
      ["Ramesh", "Ramesh Traders Pvt Ltd", "9876543210", "ramesh@supplier.com", "Delhi", "07AAAAA0000A1Z5"],
      ["Suresh", "Suresh Wholesale", "9123456780", "", "Mumbai", ""],
    ],
  },
};

interface PreviewRow {
  row: number;
  data: Record<string, string>;
  valid: boolean;
}

function parseCsv(text: string, config: ImportConfig): PreviewRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1, 51).map((line, i) => {
    const vals = line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
    const data: Record<string, string> = {};
    headers.forEach((h, j) => {
      data[h] = vals[j] ?? "";
    });
    const requiredCol = config.columns[0];
    const valid = !!data[requiredCol];
    return { row: i + 2, data, valid };
  });
}

function buildTemplateCsv(config: ImportConfig): string {
  const header = config.columns.join(",");
  const rows = config.example.map((r) => r.map((v) => `"${v}"`).join(","));
  return [header, ...rows].join("\n");
}

type ImportRouteParams = { type?: EntityType };

type Props = NativeStackScreenProps<import("../../../navigation").MoreStackParams, "Import">;

export function ImportScreen({ navigation, route }: Props) {
  const qc = useQueryClient();
  const typeParam = route.params?.type;
  const initialType: EntityType =
    typeParam === "customers" || typeParam === "suppliers" ? typeParam : "customers";

  const [step, setStep] = useState<Step>(1);
  const [entityType, setEntityType] = useState<EntityType>(initialType);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState(false);

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
    } else {
      showAlert("Template ready", `Template saved to cache. Use a file manager to access ${filename}`);
    }
  }

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setFileName(asset.name);
      setPreviewRows(parseCsv(content, config));
      setStep(3);
    } catch (err: any) {
      showAlert("Error", err?.message ?? "Could not read file");
    }
  }

  async function handleImport() {
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        validRows.map((r) => {
          const d = r.data;
          if (entityType === "customers") {
            return customerExtApi.create({
              name: d["Name"] ?? "",
              phone: d["Phone"] || undefined,
              email: d["Email"] || undefined,
              landmark: d["Address"] || undefined,
              notes: d["GST Number"] ? `GSTIN: ${d["GST Number"]}` : undefined,
              openingBalance: d["Opening Balance"] ? parseFloat(d["Opening Balance"]) : undefined,
            });
          }
          return supplierApi.create({
            name: d["Name"] ?? "",
            companyName: d["Company Name"] || undefined,
            phone: d["Phone"] || undefined,
            email: d["Email"] || undefined,
            address: d["Address"] || undefined,
            gstin: d["GSTIN"] || undefined,
          });
        })
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      setLoading(false);
      setDone(true);
      setStep(4);
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      let msg = `✅ ${succeeded} ${config.label} imported successfully!`;
      if (failed > 0) msg += `\n${failed} rows failed.`;
      if (invalidCount > 0) msg += `\n${invalidCount} rows skipped (invalid).`;
      showAlert("Import complete", msg, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setLoading(false);
      showAlert("Import failed", err?.message ?? "Unknown error");
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center border-b border-slate-200 bg-card px-4 py-3">
        <TouchableOpacity
          onPress={() => (canGoBack ? setStep((s) => (s - 1) as Step) : navigation.goBack())}
          className="mr-3 p-1"
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-800">Import Data</Text>
          <Text className="text-xs text-slate-500">Bulk import from CSV</Text>
        </View>
      </View>

      {/* Stepper */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-slate-100">
        {steps.map((label, i) => (
          <View key={label} className="flex-row items-center">
            <View
              className={`h-6 w-6 rounded-full items-center justify-center ${
                step > i + 1 ? "bg-green-500" : step === i + 1 ? "bg-primary" : "bg-slate-200"
              }`}
            >
              <Text className={`text-xs font-bold ${step > i + 1 || step === i + 1 ? "text-white" : "text-slate-500"}`}>
                {step > i + 1 ? "✓" : i + 1}
              </Text>
            </View>
            <Text className={`ml-1 text-[10px] font-medium ${step === i + 1 ? "text-slate-800" : "text-slate-500"}`}>
              {label}
            </Text>
            {i < steps.length - 1 && <View className="ml-2 h-px w-4 bg-slate-200" />}
          </View>
        ))}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Step 1: Type */}
        {step === 1 && (
          <View className="gap-4">
            <Text className="text-sm font-semibold text-slate-700">What do you want to import?</Text>
            <View className="flex-row gap-2">
              {(["customers", "suppliers"] as EntityType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setEntityType(t)}
                  className={`flex-1 rounded-xl border-2 p-4 items-center ${
                    entityType === t ? "border-primary bg-primary/5" : "border-slate-200 bg-white"
                  }`}
                >
                  <Ionicons name={t === "customers" ? "people" : "cube"} size={32} color={entityType === t ? "#e67e22" : "#64748b"} />
                  <Text className={`mt-2 text-sm font-semibold ${entityType === t ? "text-primary" : "text-slate-600"}`}>
                    {CONFIGS[t].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setStep(2)}
              className="mt-4 bg-primary rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Upload */}
        {step === 2 && (
          <View className="gap-4">
            <Text className="text-sm font-semibold text-slate-700">Upload your CSV file</Text>
            <Text className="text-xs text-slate-500">
              Download the template, fill it with your data, then pick the file.
            </Text>
            <TouchableOpacity
              onPress={handleDownloadTemplate}
              className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <Ionicons name="download" size={24} color="#64748b" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-800">Download template</Text>
                <Text className="text-xs text-slate-500">import-{config.type}-template.csv</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePickFile}
              className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <Ionicons name="document-attach" size={24} color="#64748b" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-800">Pick CSV file</Text>
                <Text className="text-xs text-slate-500">Select from device</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <View className="gap-4">
            <Text className="text-sm font-semibold text-slate-700">Preview</Text>
            <Text className="text-xs text-slate-500">
              {fileName} — {validRows.length} valid rows, {invalidCount} skipped
            </Text>
            <View className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {validRows.slice(0, 5).map((r, i) => (
                <View key={i} className="flex-row flex-wrap gap-2 p-3 border-b border-slate-100">
                  <Text className="text-xs font-medium text-slate-600">{r.data["Name"] ?? "—"}</Text>
                  {r.data["Phone"] ? <Text className="text-xs text-slate-500">{r.data["Phone"]}</Text> : null}
                </View>
              ))}
              {validRows.length > 5 && (
                <Text className="p-3 text-xs text-slate-500">+ {validRows.length - 5} more</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleImport}
              disabled={loading || validRows.length === 0}
              className={`mt-4 rounded-xl py-3 items-center ${validRows.length === 0 || loading ? "bg-slate-300" : "bg-primary"}`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-semibold">Import {validRows.length} {config.label}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Done */}
        {step === 4 && done && (
          <View className="items-center py-12">
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            <Text className="mt-4 text-lg font-bold text-slate-800">Import complete</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="mt-6 bg-primary rounded-xl px-6 py-3"
            >
              <Text className="text-white font-semibold">Back to Parties</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
