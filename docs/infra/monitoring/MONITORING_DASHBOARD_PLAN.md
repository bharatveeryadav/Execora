> Research Consolidation: This file is a detailed appendix under docs/RESEARCH_MASTER.md.
> Update cross-domain research summary and priorities in docs/RESEARCH_MASTER.md first.

> Backend Truth: Active runtime behavior is defined by packages/api/src/index.ts, packages/api/src/api/index.ts, and packages/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Execora — Owner Monitoring Dashboard
## Business Security & Transaction Surveillance
### Plan v2.0 | March 16, 2026 — Updated with all sprints M1–M6

---

## WHAT THIS IS

A real-time **owner-only monitoring panel** that:

- Tracks every employee action on transactions (create, edit, cancel, discount, payment, refund)
- Records a webcam photo/clip at key transaction moments (bill finalised, cash paid, drawer opened)
- Streams live webcam from the counter to the owner's phone/desktop remotely
- Sends real-time alerts when unusual events occur (unknown face, large discount, cash void)
- Works with **webcam, phone camera, IP camera (RTSP/MJPEG)** — all via browser
- Gives filters by employee, shift, event type, amount range, date
- Real AI face detection + re-identification (128-dim neural embeddings)
- Kirana cash flow: footfall, hourly bills chart, EOD reconciliation, drawer audit

**Target:** Kirana owner sitting at home, watching their shop counter in real-time.

---

## SPRINT STATUS

| Sprint | Feature | Status |
|--------|---------|--------|
| M1 | DB schema + API routes + WebSocket events | ✅ COMPLETE |
| M2 | Dashboard UI — event feed, alerts, activity table, employee summary | ✅ COMPLETE |
| M3 | Camera snapshots + browser notifications | ✅ COMPLETE |
| M4 | WebRTC live feed + AI detection (motion, cash, face) | ✅ COMPLETE |
| M5 | Kirana cash monitoring (footfall, drawer, reconciliation, hourly chart) | ✅ COMPLETE |
| M6 | Employee monitoring — risk indicators, per-employee timeline, anomaly detection | ✅ COMPLETE |
| M7 | Better face model — SSD MobileNetV1 + ArcFace option | 🔜 NEXT |

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│ COUNTER DEVICE (phone / desktop with webcam)                    │
│                                                                 │
│  CameraCapture.tsx ──capture frame──► /api/v1/monitoring/snap   │
│  LiveStreamSender.tsx ──WebRTC────► WebSocket /ws               │
│  useCashDetection.ts ─HSV analysis─► face.seen / cash.transaction│
│  useFaceAI.ts ────────TensorFlow──► 128-dim face descriptors    │
│  FaceTransactionTracker.tsx ── links faces to WS billing events │
│  Transaction event ──hook──► ActivityLog + broadcaster.send()   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ WebSocket (WS relay server)
┌──────────────────────────────▼──────────────────────────────────┐
│ OWNER DEVICE (phone anywhere)                                   │
│                                                                 │
│  Monitoring.tsx ──────────────────────► Full dashboard          │
│  LiveStreamViewer.tsx ─WebRTC peer─── receives counter video    │
│  FaceActivityPanel.tsx ──────────────► face grid + transaction  │
│  EmployeeSummary.tsx ─────────────────► risk cards + timeline   │
│  KiranaStatsBar.tsx ──────────────────► 6 live KPIs             │
│  HourlyBillsChart.tsx ────────────────► 24-hour bar chart       │
│  CashReconciliationWidget.tsx ─────────► EOD cash entry         │
│  DrawerAlertWidget.tsx ───────────────► no-ring detection       │
└─────────────────────────────────────────────────────────────────┘
```

---

## COMPLETE FILE INVENTORY

### Backend

| File | What it does |
|------|-------------|
| `packages/modules/src/modules/monitoring/monitoring.service.ts` | recordEvent, getStats (with footfall/hourly/byEmployee), recordCashReconciliation, getCashReconciliation |
| `packages/api/src/api/routes/monitoring.routes.ts` | All /api/v1/monitoring/* routes |
| `packages/api/src/api/routes/rtc-relay.ts` | WebRTC signalling relay for peer-to-peer video |
| `packages/db/schema.prisma` | MonitoringEvent model, MonitoringConfig model |

### Frontend Components

| File | What it does |
|------|-------------|
| `apps/web/src/pages/Monitoring.tsx` | Main dashboard page (owner-only) |
| `apps/web/src/components/monitoring/LiveFeedPanel.tsx` | Camera panel switcher (sender/viewer/IP) |
| `apps/web/src/components/monitoring/LiveStreamSender.tsx` | Counter-side: webcam + WebRTC + face AI + cash detection |
| `apps/web/src/components/monitoring/LiveStreamViewer.tsx` | Owner-side: receive WebRTC stream from counter |
| `apps/web/src/components/monitoring/useFaceAI.ts` | TensorFlow.js face detection + 128-dim descriptors |
| `apps/web/src/components/monitoring/FaceTransactionTracker.tsx` | Link faces to billing WS events, maintain FaceRegistry |
| `apps/web/src/components/monitoring/FaceActivityPanel.tsx` | Face grid UI + per-face transaction sheet |
| `apps/web/src/components/monitoring/useCashDetection.ts` | HSV color analysis for Indian rupee note detection |
| `apps/web/src/components/monitoring/CameraCapture.tsx` | Periodic camera snapshots to MinIO |
| `apps/web/src/components/monitoring/KiranaStatsBar.tsx` | 6 KPI cards (bills, cash, avg, footfall, conversion, alerts) |
| `apps/web/src/components/monitoring/HourlyBillsChart.tsx` | 24-hour bill frequency bar chart |
| `apps/web/src/components/monitoring/CashReconciliationWidget.tsx` | EOD cash entry + discrepancy display |
| `apps/web/src/components/monitoring/DrawerAlertWidget.tsx` | Drawer open logging + no-ring detection |
| `apps/web/src/components/monitoring/EmployeeSummary.tsx` | Employee cards with risk badges (cancel rate, no-ring, etc.) |
| `apps/web/src/components/monitoring/EmployeeDetailSheet.tsx` | Full event timeline for one employee + risk analysis |
| `apps/web/src/components/monitoring/EventFeed.tsx` | Real-time event feed (WebSocket) |
| `apps/web/src/components/monitoring/AlertPanel.tsx` | Unread alert cards |
| `apps/web/src/components/monitoring/ActivityTable.tsx` | Filterable event log table |
| `apps/web/src/components/monitoring/ActivityFilters.tsx` | Date/type/severity filters |
| `apps/web/src/components/monitoring/SnapGallery.tsx` | Camera snapshot gallery from MinIO |
| `apps/web/src/components/monitoring/MonitoringSettings.tsx` | Config UI (camera enable, thresholds) |

---

## KEY TECHNICAL DECISIONS

### Face Re-identification (no enrollment required)
- Model: `@vladmandic/face-api` (TensorFlow.js) loaded lazily from jsDelivr CDN
- Flow: TinyFaceDetector → faceLandmark68TinyNet → faceRecognitionNet → 128-dim descriptor
- Re-ID: euclidean distance < 0.55 between descriptors = same person
- Registry: session-local Map + sessionStorage (survives hot-reload, not tab close)
- Each new face gets `crypto.randomUUID()` — no DB enrollment needed

### Cash Detection (HSV color analysis)
- 7 Indian denomination color profiles in HSV space (₹10 yellow, ₹20 green, ₹50, ₹100, ₹200, ₹500 gray-lavender, ₹2000 pink-magenta)
- Skin-tone detection combined: currency pixels > 4% AND skin pixels > 2% → cash transaction
- Fires to monitoring API as `cash.transaction` event with denomination hint
- 350ms interval, 160×120 downsampled canvas

### Cash Reconciliation (no schema changes)
- Stored as `MonitoringEvent` with `eventType: 'cash.reconciliation'`
- `entityId` = date string (YYYY-MM-DD)
- `meta.expected`, `meta.actual`, `meta.discrepancy`
- Severity: > ₹500 discrepancy → alert, > ₹100 → warning, else info

### Drawer No-Ring Detection
- Counter staff click "Log Drawer Opened" button
- Component checks last 60 seconds for `bill.created` event from same userId
- No recent bill → stores severity `warning` "possible no-ring" monitoring event
- DrawerAlertWidget shows today's history with OK/No-sale badges

### Employee Risk Scoring (client-side, no ML)
- Cancel rate ≥ 25% → `alert`; ≥ 10% → `warning`
- Payments > bills + 2 → `warning` (could indicate recording payments without billing)
- Events present but no bills → `warning`
- No-ring events ≥ 3 → `alert`; ≥ 1 → `warning`

---

## API ENDPOINTS

```
GET    /api/v1/monitoring/events         — list with filters
POST   /api/v1/monitoring/events         — create event (front-end fire-and-forget)
GET    /api/v1/monitoring/events/unread  — unread count
POST   /api/v1/monitoring/events/read-all
POST   /api/v1/monitoring/events/:id/read
GET    /api/v1/monitoring/stats          — KPIs + byEmployee + hourly
GET    /api/v1/monitoring/config         — camera/threshold settings
PUT    /api/v1/monitoring/config
POST   /api/v1/monitoring/snap           — upload face/motion snapshot (multipart)
GET    /api/v1/monitoring/snap/:key      — get signed URL
POST   /api/v1/monitoring/cash-reconciliation
GET    /api/v1/monitoring/cash-reconciliation/:date
```

---

## MONITORING EVENT TYPES

| Event Type | Trigger | Stored by |
|------------|---------|-----------|
| `bill.created` | Invoice saved | invoice.service.ts |
| `bill.cancelled` | Invoice cancelled | invoice.service.ts |
| `payment.recorded` | Payment saved | invoice.service.ts |
| `person.detected` | Face detected in frame | FaceTransactionTracker |
| `face.seen` | New unknown face appears | FaceTransactionTracker |
| `face.transaction` | Face linked to bill/payment | FaceTransactionTracker |
| `cash.transaction` | Currency note detected in camera | LiveStreamSender |
| `cash.drawer.opened` | Staff clicks "Log Drawer" | DrawerAlertWidget |
| `cash.reconciliation` | EOD cash entry | CashReconciliationWidget |
| `motion.detected` | Motion detected in frame | LiveStreamSender |

---

## SPRINT M7 — NEXT: Better Face Model

### Problem with current TinyFaceDetector
- Struggles with side profiles (> 30° angle)
- Fails in low light (< 200 lux)
- Misses faces at > 3m distance from camera

### Proposed upgrade
- Detector: `SSD MobileNetV1` (larger but much better accuracy, ~4MB model)
- Landmarks: Full `faceLandmark68Net` (not tiny version)
- Recognition: Keep `faceRecognitionNet` (already best available in face-api)

### Implementation
- In `useFaceAI.ts`: change `nets.tinyFaceDetector` → `nets.ssdMobilenetv1`
- Change `new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })` → `new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })`
- Change `withFaceLandmarks(true)` → `withFaceLandmarks()` (full 68-point)
- Add model load: `fa.nets.ssdMobilenetv1.loadFromUri(MODEL_CDN)`
- Remove: `fa.nets.tinyFaceDetector` and `fa.nets.faceLandmark68TinyNet`

### Trade-off
- Model download: ~5MB extra on first use (CDN-cached forever after)
- CPU: ~2× slower than tiny; still real-time at 900ms interval
- Accuracy: significantly better in side-profile and low-light

---

## SPRINT M8 — PLANNED: Shift Tracking

### Goal
- Clock-in / clock-out per employee
- Track shift duration
- Alert if employee logged in outside shift hours (e.g. 11pm access)
- Shift summary: bills/hour rate, breaks, idle periods

### Implementation
- New `MonitoringEvent` types: `shift.start`, `shift.end`
- Employee can start/end shift from their own dashboard
- Owner can see shift overview on monitoring page
- Alert rules: bills created > X hours after last shift.start → possible unauthorized access

---

## SPRINT M9 — PLANNED: AI Anomaly Detection (backend)

### Goal
- ML-based outlier detection for employee patterns
- Compare today's cancel rate vs 30-day baseline
- Flag statistically significant deviations
- "Employee X normally cancels 2% — today is 18%, unusual"

### Implementation
- Background job (BullMQ worker) runs nightly
- Computes 30-day rolling averages per employee
- Stores anomaly events as `monitoring.anomaly` type
- Owner gets morning digest notification

---

## KNOWN ISSUES / LIMITATIONS

1. **Face model CDN**: First load requires internet (6MB download). After that, browser caches.
2. **No face enrollment**: Cannot say "this face = Ramesh". Only tracks anonymous IDs per session. Tab close = registry lost.
3. **Cash detection false positives**: Orange/yellow packaging near counter can trigger ₹10/₹50 detection.
4. **WebRTC**: Requires same network or TURN server for cross-network relay. Current setup: signalling only via WS relay, no TURN.
5. **sessionStorage registry**: Face registry lost on tab close. Suggestion: persist to IndexedDB with enrollment/naming.

---

## HOW TO TEST

```bash
# Start services
docker compose up --build

# Open monitoring as owner
http://localhost:5173/monitoring

# In Live Camera panel:
# - Click "Counter" device toggle
# - Allow camera permission
# - Face AI loads models (first time: ~10s download)
# - Show face → green circle appears in FaceActivityPanel
# - Create a bill → bill linked to face in "Faces" tab

# Employee monitoring:
# - Go to "Employee Summary" tab
# - Click any employee card → timeline sheet opens
# - Cancel rate bars, risk badges visible
```
