/**
 * BarcodeScanner — native camera barcode/QR scanner (Sprint 15).
 * Used in Billing (item search) and Items (add product).
 */
import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

export interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  hint?: string;
}

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] as const;

export function BarcodeScanner({
  visible,
  onClose,
  onScan,
  hint = "Point camera at product barcode",
}: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const lastScanned = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBarcodeScanned = useCallback(
    (result: { data: string }) => {
      const data = result?.data ?? "";
      if (!data?.trim() || lastScanned.current === data) return;
      lastScanned.current = data;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        lastScanned.current = null;
      }, 2000);

      setScanning(false);
      Vibration.vibrate(100);
      onScan(data.trim());
      onClose();
    },
    [onScan, onClose]
  );

  const handleClose = () => {
    setScanning(true);
    lastScanned.current = null;
    onClose();
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible animationType="slide" transparent>
        <View style={styles.centered}>
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#e67e22" />
            <Text style={styles.cardText}>Checking camera permission…</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible animationType="slide" transparent>
        <View style={styles.centered}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Camera access needed</Text>
            <Text style={styles.cardText}>
              Execora needs camera access to scan product barcodes.
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Allow camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan barcode</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [...BARCODE_TYPES],
            }}
            onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
          />
          <View style={styles.viewfinder} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    margin: 24,
    alignItems: "center",
    minWidth: 280,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 8 },
  cardText: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 16 },
  primaryButton: {
    backgroundColor: "#e67e22",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondaryButton: { paddingVertical: 12 },
  secondaryButtonText: { color: "#64748b", fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: "600", color: "#fff" },
  placeholder: { width: 44 },
  cameraWrap: { flex: 1, position: "relative" },
  viewfinder: {
    position: "absolute",
    top: "50%",
    left: "10%",
    right: "10%",
    height: 200,
    marginTop: -100,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
  },
  footer: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  hint: { fontSize: 14, color: "#94a3b8", textAlign: "center" },
});
