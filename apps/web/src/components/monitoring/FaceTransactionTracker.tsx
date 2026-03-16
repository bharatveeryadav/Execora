/**
 * FaceTransactionTracker — invisible component.
 *
 * Responsibilities:
 *   1. Run face AI on the counter video stream
 *   2. Maintain a session-local FaceRegistry:
 *        faceId  → { descriptor, thumbnail, firstSeen, lastSeen, transactions[] }
 *      Re-identify the same person using euclidean distance < 0.55
 *   3. On 'bill.created' / 'payment.recorded' monitoring WS events:
 *        → link currently visible faces to the transaction
 *        → POST face.transaction events to the monitoring API
 *   4. Export the live FaceRegistry so FaceActivityPanel can render it
 *
 * Storage:
 *   - Per-event face thumbnail stored as MinIO snap (fire-and-forget)
 *   - Descriptor serialized as regular array in event meta (JSON-safe)
 *   - Registry lives in memory + sessionStorage (survives hot-reload, not tab close)
 */
import { useCallback, useEffect, useRef } from 'react';
const uuid = () => crypto.randomUUID();
import { wsClient } from '@/lib/ws';
import { monitoringApi } from '@/lib/api';
import { useFaceAI, descriptorDistance, SAME_PERSON_THRESHOLD, type DetectedFace } from './useFaceAI';

export interface FaceRecord {
  faceId:           string;
  descriptor:       number[];     // serialized Float32Array
  thumbnail:        string;       // base64 JPEG 64×64
  firstSeen:        string;       // ISO timestamp
  lastSeen:         string;
  transactionCount: number;
  totalAmount:      number;
  transactions:     FaceTransaction[];
}

export interface FaceTransaction {
  eventType:   string;
  description: string;
  amount?:     number;
  time:        string;
}

export type FaceRegistry = Map<string, FaceRecord>;

interface Props {
  videoRef:    React.RefObject<HTMLVideoElement | null>;
  active:      boolean;
  onRegistry?: (reg: FaceRegistry) => void;
}

const REGISTRY_KEY = 'execora_face_registry';

function loadRegistry(): FaceRegistry {
  try {
    const raw = sessionStorage.getItem(REGISTRY_KEY);
    if (!raw) return new Map();
    const arr: [string, FaceRecord][] = JSON.parse(raw);
    return new Map(arr);
  } catch { return new Map(); }
}

function saveRegistry(reg: FaceRegistry) {
  try {
    sessionStorage.setItem(REGISTRY_KEY, JSON.stringify([...reg.entries()]));
  } catch {}
}

/** Find existing faceId by comparing descriptor distance */
function findMatch(descriptor: Float32Array, registry: FaceRegistry): string | null {
  let best: string | null = null;
  let bestDist = SAME_PERSON_THRESHOLD;
  for (const [id, rec] of registry) {
    const stored = new Float32Array(rec.descriptor);
    const dist   = descriptorDistance(descriptor, stored);
    if (dist < bestDist) { bestDist = dist; best = id; }
  }
  return best;
}

/** Upload face thumbnail as a snap and fire face.seen event */
async function emitFaceEvent(
  faceId: string,
  thumbnail: string,
  eventType: 'face.seen' | 'face.transaction',
  extra: { description: string; amount?: number; transactionRef?: string },
) {
  // Convert base64 to blob for snap upload
  try {
    const blob  = await (await fetch(thumbnail)).blob();
    const form  = new FormData();
    form.append('snap',        blob,       `face-${faceId}.jpg`);
    form.append('eventType',   eventType);
    form.append('entityType',  'person');
    form.append('entityId',    faceId);
    form.append('description', extra.description);

    // Fire-and-forget snap upload
    fetch('/api/v1/monitoring/snap', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('execora_token') ?? ''}` },
      body: form,
    }).catch(() => {});

    // Also post the structured event with descriptor (for querying)
    monitoringApi.postEvent({
      eventType,
      entityType:  'person',
      entityId:    faceId,
      description: extra.description,
      amount:      extra.amount,
      meta:        { faceId, transactionRef: extra.transactionRef },
      severity:    'info',
    }).catch(() => {});
  } catch {}
}

export function FaceTransactionTracker({ videoRef, active, onRegistry }: Props) {
  const registryRef    = useRef<FaceRegistry>(loadRegistry());
  const lastFacesRef   = useRef<DetectedFace[]>([]);
  const onRegistryRef  = useRef(onRegistry);
  onRegistryRef.current = onRegistry;

  const notifyRegistry = useCallback(() => {
    saveRegistry(registryRef.current);
    onRegistryRef.current?.(new Map(registryRef.current));
  }, []);

  // ── Face AI ────────────────────────────────────────────────────────────────
  useFaceAI(videoRef, {
    enabled: active,
    onFace: useCallback((detected: DetectedFace[]) => {
      lastFacesRef.current = detected;
      const now = new Date().toISOString();
      let changed = false;

      for (const face of detected) {
        const existing = findMatch(face.descriptor, registryRef.current);

        if (existing) {
          // Update existing record
          const rec = registryRef.current.get(existing)!;
          rec.lastSeen  = now;
          // Refresh thumbnail
          rec.thumbnail = face.thumbnail;
          changed = true;
        } else {
          // New person — assign faceId
          const faceId = uuid();
          registryRef.current.set(faceId, {
            faceId,
            descriptor:       Array.from(face.descriptor),
            thumbnail:        face.thumbnail,
            firstSeen:        now,
            lastSeen:         now,
            transactionCount: 0,
            totalAmount:      0,
            transactions:     [],
          });
          changed = true;
          // Fire face.seen snap (async, fire-and-forget)
          emitFaceEvent(faceId, face.thumbnail, 'face.seen', {
            description: `New person detected at counter`,
          });
        }
      }

      if (changed) notifyRegistry();
    }, [notifyRegistry]),
  });

  // ── Listen for billing WS events ──────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const offBill = wsClient.on('monitoring:event', (payload) => {
      const p = payload as {
        eventType?: string;
        description?: string;
        amount?: number;
        entityId?: string;
      };
      if (
        p.eventType !== 'bill.created' &&
        p.eventType !== 'payment.recorded' &&
        p.eventType !== 'cash.transaction'
      ) return;

      // Get faces visible in the last 3 seconds
      const visibleNow = lastFacesRef.current;
      if (visibleNow.length === 0) return;

      const now = new Date().toISOString();
      const txRef = `${p.eventType}@${now}`;

      for (const face of visibleNow) {
        const faceId = findMatch(face.descriptor, registryRef.current);
        if (!faceId) continue;
        const rec = registryRef.current.get(faceId)!;
        rec.transactionCount++;
        if (p.amount) rec.totalAmount += p.amount;
        rec.transactions.unshift({
          eventType:   p.eventType ?? 'unknown',
          description: p.description ?? p.eventType ?? '',
          amount:      p.amount,
          time:        now,
        });
        // Keep only last 50 transactions per face
        if (rec.transactions.length > 50) rec.transactions.length = 50;

        // Emit face.transaction event with snap
        emitFaceEvent(faceId, face.thumbnail, 'face.transaction', {
          description: `Face linked to ${p.eventType}${p.amount ? ` ₹${p.amount}` : ''}`,
          amount:      p.amount,
          transactionRef: txRef,
        });
      }
      notifyRegistry();
    });

    return () => offBill();
  }, [active, notifyRegistry]);

  // Clear registry when camera stops
  useEffect(() => {
    if (!active) {
      lastFacesRef.current = [];
    }
  }, [active]);

  return null; // invisible
}
