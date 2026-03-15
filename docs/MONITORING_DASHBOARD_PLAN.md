# Execora — Owner Monitoring Dashboard
## Business Security & Transaction Surveillance
### Plan v1.0 | March 15, 2026

---

## WHAT THIS IS

A real-time **owner-only monitoring panel** that:

- Tracks every employee action on transactions (create, edit, cancel, discount, payment, refund)
- Records a webcam photo/clip at key transaction moments (bill finalised, cash paid, drawer opened)
- Streams live webcam from the counter to the owner's phone/desktop remotely
- Sends real-time alerts when unusual events occur (unknown face, large discount, cash void)
- Works with **webcam, phone camera, IP camera (RTSP/MJPEG)** — all via browser
- Gives filters by employee, shift, event type, amount range, date

**Target:** Kirana owner sitting at home, watching their shop counter in real-time.

---

## USER STORIES

| # | Story | Priority |
|---|-------|----------|
| M-01 | As owner, I see a live feed of the counter webcam on my phone | P0 |
| M-02 | When any bill is created, I get a notification with amount + employee name | P0 |
| M-03 | When cash is received, a photo is auto-captured from the counter camera | P0 |
| M-04 | I can replay the last 100 transaction events with timestamps | P0 |
| M-05 | Alert fires if bill > ₹5,000 is cancelled or voided | P0 |
| M-06 | Alert fires if discount > 20% is applied | P0 |
| M-07 | I see which employee (by login) touched which transaction | P1 |
| M-08 | Motion detected at counter when shop is supposed to be closed → alert | P1 |
| M-09 | Unknown face at counter (face not in employee whitelist) → alert | P2 |
| M-10 | Export activity log as CSV for specific date range | P1 |
| M-11 | Filter events by employee, type, amount, date | P1 |
| M-12 | Heatmap: busiest hours at counter | P2 |

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│ COUNTER DEVICE (phone / desktop with webcam)                    │
│                                                                 │
│  CameraCapture.tsx ──capture frame──► /api/v1/monitoring/snap   │
│  LiveStreamSender.tsx ──WebRTC────► WebSocket /ws               │
│  Transaction event ──hook──► ActivityLog + broadcaster.send()   │
└──────────────────────────────┬──────────────────────────────────┘
                               │  WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ API SERVER                                                      │
│                                                                 │
│  monitoring.routes.ts       ← REST: events, snaps, alerts       │
│  broadcaster.send(tenantId, │  type, payload)                   │
│  MinIO                      ← stores snapshots (JPG ~50–150KB)  │
│  ActivityLog table          ← persists all events               │
│  BullMQ alertQueue          ← sends WhatsApp/push to owner      │
└──────────────────────────────┬──────────────────────────────────┘
                               │  WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ OWNER DEVICE (phone / desktop, anywhere)                        │
│                                                                 │
│  /monitoring page                                               │
│  ├─ LiveFeedViewer.tsx      ← WebRTC viewer (P2P via TURN)      │
│  ├─ EventFeed.tsx           ← real-time transaction events      │
│  ├─ AlertPanel.tsx          ← high-priority alerts (red banner)  │
│  ├─ SnapGallery.tsx         ← photo thumbnails per transaction  │
│  └─ ActivityTable.tsx       ← filterable log table             │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1 — Event Tracking + Snapshots (Week 1, No AI)

### What gets captured

| Event | Trigger | Snapshot? | Alert? |
|-------|---------|-----------|--------|
| `bill.created` | POST /api/v1/invoices | ✅ | if > alert_threshold |
| `bill.cancelled` | PATCH invoice → cancelled | ✅ | if amount > ₹2,000 |
| `payment.recorded` | POST /api/v1/payments | ✅ | always |
| `discount.applied` | lineDiscountPercent or bill discount | No | if > owner config% |
| `bill.edited` | PATCH invoice | No | if delta > ₹500 |
| `credit_note.issued` | POST /api/v1/credit-notes/:id/issue | ✅ | always |
| `user.login` | POST /api/v1/auth/login | No | from unknown IP |
| `user.logout` | POST /api/v1/auth/logout | No | No |
| `product.stock_updated` | Voice UPDATE_STOCK | No | if > minStock crosses 0 |
| `cash_drawer.open` | Manual trigger button | ✅ | No |

### Schema additions

```prisma
// Add to schema.prisma

model MonitoringEvent {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  userId       String?  @map("user_id")        // employee who acted
  eventType    String   @map("event_type")      // bill.created | payment.recorded | etc.
  entityType   String   @map("entity_type")     // invoice | payment | credit_note
  entityId     String   @map("entity_id")
  amount       Decimal?                          // money amount if relevant
  description  String                           // human-readable: "Bill ₹450 created by Rahul"
  meta         Json     @default("{}")          // extra context (customer name, items count, etc.)
  snapKey      String?  @map("snap_key")        // MinIO object key of snapshot
  snapUrl      String?  @map("snap_url")        // presigned URL (regenerated on fetch)
  severity     String   @default("info")        // info | warning | alert
  isRead       Boolean  @default(false) @map("is_read")
  createdAt    DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id])

  @@index([tenantId, createdAt(sort: Desc)])
  @@index([tenantId, severity, isRead])
  @@index([tenantId, eventType])
  @@index([tenantId, userId])
  @@map("monitoring_events")
}

model MonitoringConfig {
  tenantId             String  @id @map("tenant_id")
  enabled              Boolean @default(true)
  snapsOnBills         Boolean @default(true) @map("snaps_on_bills")
  snapsOnPayments      Boolean @default(true) @map("snaps_on_payments")
  alertDiscountAbove   Decimal @default(20) @map("alert_discount_above") // %
  alertCancelAbove     Decimal @default(2000) @map("alert_cancel_above")  // ₹
  alertBillAbove       Decimal? @map("alert_bill_above")                  // ₹ large bill
  ownerPhoneAlert      Boolean @default(true) @map("owner_phone_alert")  // WhatsApp
  cameraEnabled        Boolean @default(false) @map("camera_enabled")
  cameraSource         String  @default("webcam") @map("camera_source")  // webcam | ip | phone
  ipCameraUrl          String? @map("ip_camera_url")                      // MJPEG stream URL
  retentionDays        Int     @default(30) @map("retention_days")        // snap retention
  updatedAt            DateTime @updatedAt @map("updated_at")
  createdAt            DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("monitoring_config")
}
```

### API Routes (`monitoring.routes.ts`)

```
GET  /api/v1/monitoring/events          — list events (filters: type, severity, userId, from, to, limit)
GET  /api/v1/monitoring/events/unread   — unread alert count (badge)
POST /api/v1/monitoring/events/read-all — mark all read
GET  /api/v1/monitoring/events/:id      — single event with snap presigned URL

POST /api/v1/monitoring/snap            — upload snapshot (multipart/form-data; body: entityType, entityId)
GET  /api/v1/monitoring/snap/:key       — get presigned URL for existing snap

GET  /api/v1/monitoring/config          — get owner alert config
PUT  /api/v1/monitoring/config          — update alert thresholds

GET  /api/v1/monitoring/stats           — daily event counts by type (for heatmap)
GET  /api/v1/monitoring/employees       — per-employee activity summary (bills, payments, cancellations)
```

### How snapshots work (no server required)

```
Counter device (browser):
  1. navigator.mediaDevices.getUserMedia({ video: true }) → MediaStream
  2. Draw to <canvas> → canvas.toBlob('image/jpeg', 0.7) → ~50–80KB JPEG
  3. POST /api/v1/monitoring/snap (multipart) with entityId, eventType
  4. API stores to MinIO bucket "monitoring-snaps" with key: {tenantId}/{date}/{uuid}.jpg
  5. API creates MonitoringEvent with snapKey
  6. API broadcasts { type: 'monitoring:snap', ... } via broadcaster.send()

Owner device (anywhere):
  7. WSContext receives 'monitoring:snap' → React Query invalidates ['monitoring']
  8. EventFeed renders new row with thumbnail
  9. Click snap → API generates presigned URL (15min TTL) → opens in lightbox
```

### Transaction hook pattern

Add to `invoice.service.ts` and `payment.service.ts` after each write:

```ts
// After invoice creation
await monitoringService.recordEvent({
  tenantId,
  userId,
  eventType: 'bill.created',
  entityType: 'invoice',
  entityId: invoice.id,
  amount: invoice.total,
  description: `Bill ${invoice.invoiceNo} ₹${invoice.total} created${customer ? ` for ${customer.name}` : ''}`,
  severity: Number(invoice.total) > (config.alertBillAbove ?? Infinity) ? 'warning' : 'info',
});
broadcaster.send(tenantId, 'monitoring:event', { eventType: 'bill.created', amount: invoice.total });
```

---

## PHASE 2 — Live Video Feed (Week 2)

### Webcam → Owner (WebRTC peer-to-peer)

**Why WebRTC over RTSP:** Works in browser, no server video processing, low latency (<200ms), works through NAT.

```
Counter browser     ←─── WebRTC Signalling (via WebSocket) ───►    Owner browser
  RTCPeerConnection                                                 RTCPeerConnection
  getUserMedia()                                                    <video> element
  (webcam stream)
```

**Signalling flow** (using existing WebSocket):

```
Counter sends WS: { type: 'rtc:offer', offer: RTCSessionDescription }
Server relays to owner connections for same tenantId
Owner sends WS: { type: 'rtc:answer', answer: RTCSessionDescription }
Both exchange ICE candidates: { type: 'rtc:ice', candidate: RTCIceCandidateInit }
```

**Files to create:**
- `apps/web/src/components/monitoring/LiveStreamSender.tsx` — counter side, getUserMedia + RTCPeerConnection
- `apps/web/src/components/monitoring/LiveStreamViewer.tsx` — owner side, RTCPeerConnection + `<video>`
- `apps/api/src/ws/rtc-relay.ts` — relay RTC signalling messages between counter + owner

**TURN server:** For production (when counter and owner are on different networks), need a TURN server.
Options: Cloudflare (free 100GB/month), Twilio TURN (pay-per-use), Coturn self-hosted.
For dev/LAN: STUN only (Google's stun:stun.l.google.com:19302 is free).

### IP Camera / Phone Camera support

**MJPEG stream** (most IP cameras + DroidCam app on Android):
```tsx
// Simple — just an img tag refreshed every 200ms
// Or native: <img src="http://192.168.1.x:8080/video" /> — MJPEG stream
<img
  src={config.ipCameraUrl}
  className="w-full aspect-video object-cover"
  onError={() => setError(true)}
/>
```

**DroidCam (Android phone as webcam):**
- Install DroidCam on Android phone
- Opens HTTP MJPEG at `http://<phone-ip>:4747/video`
- Owner enters this URL in Monitoring Settings
- Rendered as MJPEG img tag (zero server cost)

**Browser webcam (same device):**
- `getUserMedia({ video: { facingMode: 'environment' } })` for phone rear camera
- Standard approach, already used in BarcodeScanner

---

## PHASE 3 — Motion & Face Alerts (Week 3, AI)

### Motion detection (client-side, no server cost)

```ts
// In LiveStreamSender.tsx — compare consecutive frames
// Uses OffscreenCanvas + ImageData pixel diff

const MOTION_THRESHOLD = 30; // pixel diff threshold
const MOTION_PERCENT = 0.03;  // 3% of pixels must change to trigger

function detectMotion(prevFrame: ImageData, currFrame: ImageData): boolean {
  let changedPixels = 0;
  for (let i = 0; i < prevFrame.data.length; i += 4) {
    const diff = Math.abs(prevFrame.data[i] - currFrame.data[i]);
    if (diff > MOTION_THRESHOLD) changedPixels++;
  }
  return changedPixels / (prevFrame.width * prevFrame.height) > MOTION_PERCENT;
}
```

Motion during closed hours → POST `/api/v1/monitoring/snap` with `eventType: 'motion.detected'` + WhatsApp alert.

### Face detection (client-side TensorFlow.js)

```
npm install @tensorflow-models/face-detection @tensorflow/tfjs
```

```ts
import * as faceDetection from '@tensorflow-models/face-detection';

// Load model once (MediaPipe, ~1MB WASM)
const model = await faceDetection.createDetector(
  faceDetection.SupportedModels.MediaPipeFaceDetector,
  { runtime: 'mediapipe', solutionPath: '...' }
);

// On each frame (throttled to 1fps to save CPU):
const faces = await model.estimateFaces(videoElement);
if (faces.length === 0 && previouslyHadFace) {
  // Face left counter — capture snap
}
if (faces.length > 0 && !previouslyHadFace) {
  // New person at counter — capture snap, log event
}
```

**Unknown face detection:** Requires employee face registration flow + embedding comparison.
Use MediaPipe FaceRecognizer (available in MediaPipe Tasks) — runs fully in browser.

**Complexity:** P2 — needs employee photo enrolment flow. Ship motion detection first.

---

## MONITORING DASHBOARD UI

### Page: `/monitoring` (owner-only, requires `role: owner | admin`)

```
┌──────────────────────────────────────────────────────────┐
│ Monitoring Dashboard                  🔴 3 alerts  ⚙️    │
├──────────────┬───────────────────────────────────────────┤
│              │  ALERT PANEL (red)                        │
│  LIVE FEED   │  ⚠️ Bill cancelled ₹3,200 — Ravi 14:32   │
│              │  ⚠️ Discount 30% on ₹1,500 — Rahul 13:10 │
│  [webcam]    │  ⚠️ Unknown login from 192.168.1.99       │
│  or          ├───────────────────────────────────────────┤
│  [MJPEG]     │  ACTIVITY FEED (real-time scroll)         │
│              │  ✅ Bill INV/26/234 ₹450 — Rahul 15:01    │
│  [No camera  │  💰 ₹1,200 cash received — Priya 14:58   │
│   configured]│  📦 Stock: Aata 50kg added — Rahul 14:45  │
│              │  ✅ Bill INV/26/233 ₹180 — Ravi 14:42     │
├──────────────┴───────────────────────────────────────────┤
│  FILTERS: [All Employees ▼] [All Events ▼] [Today ▼]    │
│           [Amount: ₹0 — ₹99999] [Severity: All ▼]       │
├──────────────────────────────────────────────────────────┤
│  SNAPSHOTS GRID                                          │
│  [📷 thumb] [📷 thumb] [📷 thumb] [📷 thumb] [📷 thumb]  │
│  click to view fullsize with event context               │
├──────────────────────────────────────────────────────────┤
│  EMPLOYEE SUMMARY (today)                                │
│  Rahul: 23 bills, ₹12,400 | Ravi: 18 bills, ₹9,200      │
│  Priya: 12 payments, ₹8,500                              │
└──────────────────────────────────────────────────────────┘
```

### Component tree

```
pages/Monitoring.tsx
├── components/monitoring/
│   ├── LiveFeedPanel.tsx      — camera feed (webcam/MJPEG/WebRTC/none)
│   ├── AlertPanel.tsx         — red banner, unread alerts list
│   ├── EventFeed.tsx          — real-time scrolling activity list
│   ├── SnapGallery.tsx        — photo grid, lightbox on click
│   ├── EmployeeSummary.tsx    — per-user stats cards
│   ├── ActivityFilters.tsx    — employee/type/date/amount/severity filters
│   ├── ActivityTable.tsx      — paginated table, export CSV
│   ├── MonitoringSettings.tsx — alert thresholds, camera URL, retention
│   └── CameraCapture.tsx      — hidden component runs on counter device,
│                                captures frames on WS trigger
```

---

## CAMERA TYPES SUPPORTED

| Camera Type | How | Setup needed |
|-------------|-----|--------------|
| **Browser webcam** (USB, laptop built-in) | `getUserMedia()` | Allow camera in browser |
| **Phone rear camera** | `getUserMedia({ facingMode: 'environment' })` | Open app on phone |
| **Android phone as IP cam** | DroidCam MJPEG HTTP stream | Install DroidCam app |
| **IP camera (ONVIF/RTSP)** | Via MJPEG proxy or MJPEG-capable cameras | Enter stream URL in settings |
| **MJPEG IP camera** | Direct `<img src="http://cam-ip/video">` | Enter stream URL in settings |
| **CCTV with MJPEG output** | Same as MJPEG IP camera | Enter MJPEG endpoint |

> **RTSP** cameras (most CCTV): require a proxy on the local server (`ffmpeg -i rtsp://... -f mjpeg http://...`) — out of scope for Phase 1 but documented for self-hosted deployments.

---

## ALERT DELIVERY

| Channel | How | When |
|---------|-----|------|
| **In-app WebSocket** | `broadcaster.send()` → `monitoring:alert` | Immediate |
| **WhatsApp** | Existing `whatsappService.sendTextMessage()` | For severity=alert |
| **Browser notification** | `Notification.requestPermission()` + `new Notification()` | For owner tab in background |
| **Push (future)** | FCM via React Native / PWA | Phase 3 |

---

## DATABASE EVENTS TABLE — WHAT IT RECORDS

Each `MonitoringEvent` row contains:

```json
{
  "id": "uuid",
  "tenantId": "...",
  "userId": "emp-uuid",               // employee who acted
  "eventType": "bill.cancelled",
  "entityType": "invoice",
  "entityId": "inv-uuid",
  "amount": "3200.00",
  "description": "Bill INV/26/89 ₹3,200 CANCELLED by Ravi",
  "meta": {
    "invoiceNo": "INV/26/89",
    "customerName": "Sharma ji",
    "employeeName": "Ravi Kumar",
    "cancelledReason": "Customer returned",
    "itemCount": 5,
    "previousStatus": "pending"
  },
  "snapKey": "monitoring-snaps/tid/2026-03-15/uuid.jpg",
  "severity": "alert",
  "isRead": false,
  "createdAt": "2026-03-15T14:32:00Z"
}
```

---

## FILTER OPTIONS

Owner can filter by:

| Filter | Values |
|--------|--------|
| **Employee** | All / [employee list dropdown] |
| **Event type** | All / Bill Created / Bill Cancelled / Payment / Discount / Stock / Login / Credit Note |
| **Severity** | All / Info / Warning / Alert |
| **Date range** | Today / Yesterday / This week / This month / Custom |
| **Amount** | Min–Max range slider |
| **Has snapshot** | With photo / Without photo / All |
| **Read status** | All / Unread only |

---

## WHAT ACCURACY MEANS HERE

- **Event accuracy = 100%**: Every DB write fires a `MonitoringEvent` — no events can be missed because it's hooked into the same transaction
- **Snapshot accuracy**: Best-effort (browser must have camera permission; if page is closed, no snap). Displayed as "No snapshot" for events without camera
- **Real-time latency**: <500ms for in-app alerts (WebSocket). WhatsApp: 2–5 seconds
- **Motion detection**: ~95% accuracy at good lighting; false positives at night without IR

---

## IMPLEMENTATION ORDER (4 sprints)

### Sprint M1 — Foundation (3 days)
1. Add `MonitoringEvent` + `MonitoringConfig` to schema; `pnpm db:generate`
2. Create `monitoringService.ts` — `recordEvent()`, `getEvents()`, `markRead()`, `getStats()`
3. Add monitoring hooks to `invoice.service.ts` and `payment.service.ts`
4. Create `monitoring.routes.ts` — events list, unread count, mark read, config CRUD
5. Register routes in `api/index.ts`

### Sprint M2 — Dashboard UI (3 days)
6. Create `pages/Monitoring.tsx` and component tree
7. `EventFeed.tsx` — real-time list with WS subscription to `monitoring:event`
8. `AlertPanel.tsx` — red badge + alert list, mark-read
9. `ActivityFilters.tsx` + `ActivityTable.tsx` — paginated table, CSV export
10. `EmployeeSummary.tsx` — per-user KPI cards
11. Add `/monitoring` route to `App.tsx` (owner/admin only)

### Sprint M3 — Camera Snapshots (2 days)
12. `CameraCapture.tsx` — hidden component, `getUserMedia`, canvas frame capture
13. `POST /api/v1/monitoring/snap` — upload JPEG to MinIO, create `MonitoringEvent.snapKey`
14. `SnapGallery.tsx` — thumbnail grid, lightbox
15. `MonitoringSettings.tsx` — enable camera, configure thresholds, MJPEG URL
16. Browser `Notification` alerts for background owner tab

### Sprint M4 — Live Feed (3 days)
17. `LiveFeedPanel.tsx` — MJPEG `<img>` or webcam `<video>` depending on config
18. WebRTC signalling relay in `ws/rtc-relay.ts` for remote owner viewing
19. `LiveStreamSender.tsx` + `LiveStreamViewer.tsx`
20. Motion detection (pixel diff) + auto-snap on motion
21. WhatsApp alert for severity=alert events

---

## SECURITY & ACCESS CONTROL

- `/monitoring` page and all `/api/v1/monitoring/*` routes: **owner + admin roles only**
- Snapshots stored in private MinIO bucket `monitoring-snaps` — never public URL
- All snap access via presigned URL (15-minute TTL)
- Employees cannot see monitoring data (role-gated)
- MonitoringConfig can only be updated by owner role
- GDPR/employee privacy: add consent notice in onboarding and settings

---

## FILES TO CREATE/MODIFY

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add MonitoringEvent + MonitoringConfig models |
| `packages/modules/src/modules/monitoring/monitoring.service.ts` | New service |
| `apps/api/src/api/routes/monitoring.routes.ts` | New routes |
| `apps/api/src/api/index.ts` | Register routes |
| `packages/modules/src/modules/invoice/invoice.service.ts` | Add monitoring hooks after createInvoice |
| `packages/modules/src/modules/payment/payment.service.ts` | Add monitoring hooks |
| `apps/web/src/pages/Monitoring.tsx` | New page |
| `apps/web/src/components/monitoring/` | New folder: 8 components |
| `apps/web/src/App.tsx` | Add /monitoring route |
| `apps/web/src/lib/api.ts` | Add monitoringApi client |
| `apps/api/src/ws/rtc-relay.ts` | WebRTC signalling relay (Phase 2) |

---

## ESTIMATED EFFORT

| Sprint | Days | Deliverable |
|--------|------|-------------|
| M1 — Foundation | 3 | Events tracked for all transactions, API live |
| M2 — Dashboard | 3 | Owner sees live event feed, filters, employee summary |
| M3 — Snapshots | 2 | Photos captured at billing moments, gallery |
| M4 — Live feed | 3 | Webcam/MJPEG live view, WebRTC remote, motion alerts |
| **Total** | **11** | **Full monitoring dashboard** |

---

_Created: March 15, 2026 | Status: Plan — ready to implement_
