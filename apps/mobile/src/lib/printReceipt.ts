/**
 * Print receipt via PDF + share (Sprint 17).
 * BLE thermal printer support can be added later with react-native-ble-plx.
 */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buildReceiptHtml, type ReceiptData } from "./thermalReceipt";
import { getThermalConfig } from "./thermalSettings";

export async function printReceipt(data: ReceiptData): Promise<void> {
  const config = getThermalConfig();
  const html = buildReceiptHtml(data, config);

  // 80mm ≈ 302px at 96dpi, 58mm ≈ 219px
  const widthPx = config.width === 58 ? 219 : 302;
  const heightPx = 800; // auto height

  const { uri } = await Print.printToFileAsync({
    html,
    width: widthPx,
    height: heightPx,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Receipt ${data.invoiceNo}`,
    });
  }
}
