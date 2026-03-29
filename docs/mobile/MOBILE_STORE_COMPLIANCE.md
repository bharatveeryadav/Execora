> Research Consolidation: This file is a detailed appendix under docs/RESEARCH_MASTER.md.
> Update cross-domain research summary and priorities in docs/RESEARCH_MASTER.md first.

> Backend Truth: Active runtime behavior is defined by apps/api/src/index.ts, apps/api/src/api/index.ts, and apps/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora Mobile — Store Compliance Checklist

**Sprint 20** — App Store + Play Store submission readiness.

---

## ✅ Automated (in codebase)

| Item | Status | Location |
|------|--------|----------|
| iOS Privacy Manifest (UserDefaults, FileTimestamp) | ✅ | `app.json` → `expo.ios.privacyManifests` |
| iOS Usage Descriptions (Camera, Mic, Photos, Bluetooth, Local Network) | ✅ | `app.json` → `expo.ios.infoPlist` |
| Android targetSdkVersion 34 | ✅ | `app.json` → `expo.android` |
| Android compileSdkVersion 35 | ✅ | `app.json` |
| Android minSdkVersion 26 | ✅ | `app.json` |
| Android permissions (Camera, Notifications, Bluetooth, etc.) | ✅ | `app.json` |
| EAS production: app-bundle (not apk) | ✅ | `eas.json` |
| EAS production: autoIncrement buildNumber | ✅ | `eas.json` |

---

## 📋 Manual Steps (before submit)

### Apple App Store Connect

1. **App Privacy → Data Types** — Declare:
   - Name, Email, User ID: Yes, linked, App Functionality
   - Crash Data: Yes, not linked, Analytics
   - Performance/Diagnostic: Yes, not linked, Analytics

2. **Export Compliance** — "Does your app use encryption?" → Yes. "Exempt?" → Yes (HTTPS only).

3. **Screenshots** — 5 per device (1290×2796 for 6.7" iPhone mandatory):
   - Home Dashboard → Create Bill (Step 2) → Invoice List → Customer Ledger → Reports

4. **Metadata** — Name (30 chars), Subtitle (30), Category: Business, Privacy Policy URL, Support URL.

### Google Play Console

1. **Data Safety** — Declare Name, Email, User IDs, Crash logs, Diagnostics. Encrypted in transit ✅.

2. **Content rating** — Everyone.

3. **Screenshots** — Min 2 (1080×1920 or 1080×2400). Feature graphic 1024×500.

4. **Pre-launch report** — Fix any crashes before promoting from internal track.

---

## Build Commands

```bash
# iOS TestFlight
eas build --platform ios --profile production
eas submit --platform ios --latest

# Android internal
eas build --platform android --profile production
eas submit --platform android --latest
```

Replace `YOUR_APP_STORE_CONNECT_APP_ID` and `YOUR_APPLE_TEAM_ID` in `eas.json` before iOS submit. Add `google-play-key.json` for Android submit.
