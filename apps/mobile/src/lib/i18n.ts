/**
 * i18n setup — i18next v26 + react-i18next v17
 *
 * Supported locales: en (English), hi (Hindi), hi-en (Hinglish fallback → English)
 *
 * Usage:
 *   import '@/lib/i18n';           // import once in App.tsx
 *   import { useTranslation } from 'react-i18next';
 *   const { t } = useTranslation('common');
 *   t('save')  // → 'Save'
 */

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

// ── Translation resources ─────────────────────────────────────────────────────

import enCommon from "../locales/en/common.json";
import enBilling from "../locales/en/billing.json";
import enInventory from "../locales/en/inventory.json";
import enParties from "../locales/en/parties.json";

import hiCommon from "../locales/hi/common.json";
import hiBilling from "../locales/hi/billing.json";
import hiInventory from "../locales/hi/inventory.json";
import hiParties from "../locales/hi/parties.json";

// ── Detect device locale ──────────────────────────────────────────────────────

function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales.length > 0) {
      const lang = locales[0].languageCode ?? "en";
      // Map supported languages; fall back to 'en'
      if (lang === "hi") return "hi";
      return "en";
    }
  } catch {
    // expo-localization unavailable in test environment
  }
  return "en";
}

// ── Init ──────────────────────────────────────────────────────────────────────

void i18next.use(initReactI18next).init({
  lng: getDeviceLanguage(),
  fallbackLng: "en",
  ns: ["common", "billing", "inventory", "parties"],
  defaultNS: "common",
  resources: {
    en: {
      common: enCommon,
      billing: enBilling,
      inventory: enInventory,
      parties: enParties,
    },
    hi: {
      common: hiCommon,
      billing: hiBilling,
      inventory: hiInventory,
      parties: hiParties,
    },
  },
  interpolation: {
    escapeValue: false, // React Native handles escaping
  },
});

export default i18next;
