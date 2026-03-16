/**
 * Thermal print settings — stored in MMKV (Sprint 17).
 */
import { storage } from "./storage";

const KEY = "execora:thermal";

export type ThermalConfig = {
  width: 58 | 80;
  header: string;
  footer: string;
};

const DEFAULT: ThermalConfig = {
  width: 80,
  header: "",
  footer: "Thank you! Visit again.",
};

export function getThermalConfig(): ThermalConfig {
  try {
    const raw = storage.getString(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ThermalConfig>;
    return {
      width: parsed.width === 58 ? 58 : 80,
      header: String(parsed.header ?? ""),
      footer: String(parsed.footer ?? DEFAULT.footer),
    };
  } catch {
    return DEFAULT;
  }
}

export function setThermalConfig(config: ThermalConfig): void {
  storage.set(KEY, JSON.stringify(config));
}
