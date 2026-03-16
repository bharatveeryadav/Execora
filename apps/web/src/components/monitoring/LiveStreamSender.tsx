/**
 * LiveStreamSender — counter device component.
 *
 * Responsibilities:
 *   1. Acquire webcam stream via getUserMedia
 *   2. Show local preview
 *   3. Register as WebRTC "sender" with the server relay
 *   4. On viewer join (rtc:offer-request), create RTCPeerConnection + offer
 *   5. Run motion detection every 500ms — snap + monitoring event on trigger
 *   6. Run face detection (Chrome FaceDetector API) — snap + event on person arrival
 *   7. Run cash/note detection (HSV color analysis) — event on currency visible + hands
 *   8. Expose AI status indicators (motion level, face count, cash detected)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, User, Users, Video, VideoOff, IndianRupee } from 'lucide-react';
import { wsClient } from '@/lib/ws';
import { monitoringApi } from '@/lib/api';
import { triggerSnap } from './CameraCapture';
import { useMotionDetection } from './useMotionDetection';
import { useFaceDetection } from './useFaceDetection';
import { useCashDetection } from './useCashDetection';
import { FaceTransactionTracker, type FaceRegistry } from './FaceTransactionTracker';
import { Button } from '@/components/ui/button';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Debounce snap triggers so we don't spam on continuous motion
const SNAP_DEBOUNCE_MS = 10_000;

interface Props {
  /** entityId passed with each auto-snap (e.g. current session ID) */
  sessionId?: string;
  onStreamReady?: (stream: MediaStream) => void;
  onRegistry?: (reg: FaceRegistry) => void;
}

export function LiveStreamSender({ sessionId = 'counter', onStreamReady, onRegistry }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcMap     = useRef<Map<string, RTCPeerConnection>>(new Map()); // fromId → pc
  const lastSnapRef = useRef(0);
  const [active, setActive] = useState(false);
  const [error,  setError]  = useState('');

  // ── AI detection ────────────────────────────────────────────────────────────
  const { motionLevel, motionDetected } = useMotionDetection(videoRef, {
    enabled: active,
    onMotion: (level) => {
      const now = Date.now();
      if (now - lastSnapRef.current < SNAP_DEBOUNCE_MS) return;
      lastSnapRef.current = now;
      triggerSnap({ eventType: 'motion.detected', entityType: 'counter', entityId: sessionId, description: `Motion at counter (${Math.round(level * 100)}% pixels changed)` });
      monitoringApi.postEvent({
        eventType:   'motion.detected',
        entityType:  'counter',
        entityId:    sessionId,
        description: `Motion detected at counter — ${Math.round(level * 100)}% pixels changed`,
        severity:    'info',
        meta:        { motionLevel: level },
      }).catch(() => {/* fire-and-forget */});
    },
  });

  const { faceCount, isSupported: faceSupported } = useFaceDetection(videoRef, {
    enabled: active,
    onFaceArrived: (count) => {
      const now = Date.now();
      if (now - lastSnapRef.current < SNAP_DEBOUNCE_MS) return;
      lastSnapRef.current = now;
      triggerSnap({ eventType: 'person.detected', entityType: 'counter', entityId: sessionId, description: `Person detected at counter (${count} face${count > 1 ? 's' : ''})` });
      monitoringApi.postEvent({
        eventType:   'person.detected',
        entityType:  'counter',
        entityId:    sessionId,
        description: `${count} person${count > 1 ? 's' : ''} arrived at counter`,
        severity:    'info',
        meta:        { faceCount: count },
      }).catch(() => {});
    },
  });

  const { cashDetected, denominationHint, confidence } = useCashDetection(videoRef, {
    enabled: active,
    onCashDetected: (denom, conf) => {
      const now = Date.now();
      if (now - lastSnapRef.current < SNAP_DEBOUNCE_MS) return;
      lastSnapRef.current = now;
      const denomLabel = denom ? ` (${denom} note)` : '';
      triggerSnap({
        eventType:   'cash.transaction',
        entityType:  'counter',
        entityId:    sessionId,
        description: `Cash transaction detected${denomLabel}`,
      });
      monitoringApi.postEvent({
        eventType:   'cash.transaction',
        entityType:  'counter',
        entityId:    sessionId,
        description: `Cash transaction detected at counter${denomLabel}`,
        severity:    'info',
        meta:        { denominationHint: denom, confidence: Math.round(conf * 100) },
      }).catch(() => {});
    },
  });

  // ── WebRTC helpers ───────────────────────────────────────────────────────────
  const createPeerConnection = useCallback((viewerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(STUN);

    // Send local ICE candidates to the viewer via relay
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        wsClient.send('rtc:ice', { candidate: e.candidate.toJSON(), toId: viewerId });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc.close();
        pcMap.current.delete(viewerId);
      }
    };

    // Add all tracks from the webcam stream
    streamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current!);
    });

    pcMap.current.set(viewerId, pc);
    return pc;
  }, []);

  // ── Camera start / stop ─────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setActive(true);
      setError('');
      onStreamReady?.(stream);

      // Register as sender with the relay
      wsClient.send('rtc:register', { role: 'sender' });
    } catch (err: any) {
      setError(err.message ?? 'Camera access denied');
    }
  }, [onStreamReady]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    // Close all peer connections
    pcMap.current.forEach((pc) => pc.close());
    pcMap.current.clear();
    // Notify viewers
    wsClient.send('rtc:end', {});
    setActive(false);
  }, []);

  // ── WS signalling ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Viewer joined — they sent a request-offer ping
    const offOffer = wsClient.on('rtc:request-offer', async (msg) => {
      const { fromId } = msg as { fromId: string };
      if (!streamRef.current) return;
      const pc = createPeerConnection(fromId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsClient.send('rtc:offer', { offer: pc.localDescription?.toJSON(), toId: fromId });
    });

    // Viewer answered our offer
    const offAnswer = wsClient.on('rtc:answer', async (msg) => {
      const { answer, fromId } = msg as { answer: RTCSessionDescriptionInit; fromId: string };
      const pc = pcMap.current.get(fromId);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(() => {});
      }
    });

    // ICE candidate from a viewer
    const offIce = wsClient.on('rtc:ice', async (msg) => {
      const { candidate, fromId } = msg as { candidate: RTCIceCandidateInit; fromId: string };
      const pc = pcMap.current.get(fromId);
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    });

    return () => { offOffer(); offAnswer(); offIce(); };
  }, [createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const motionPct = Math.round(motionLevel * 100);

  return (
    <div className="rounded-lg overflow-hidden border bg-black relative">
      {/* LIVE badge */}
      {active && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>
      )}

      {/* AI status badges */}
      {active && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
          {/* Motion meter */}
          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
            motionDetected ? 'bg-amber-500 text-white' : 'bg-black/50 text-white/70'
          }`}>
            <Activity className="h-3 w-3" />
            {motionPct}%
          </span>
          {/* Face count */}
          {faceSupported && (
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
              faceCount > 0 ? 'bg-blue-600 text-white' : 'bg-black/50 text-white/70'
            }`}>
              {faceCount > 1 ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {faceCount > 0 ? `${faceCount} face${faceCount > 1 ? 's' : ''}` : 'No face'}
            </span>
          )}
          {/* Cash detection */}
          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
            cashDetected ? 'bg-green-600 text-white' : 'bg-black/50 text-white/70'
          }`}>
            <IndianRupee className="h-3 w-3" />
            {cashDetected
              ? `Cash${denominationHint ? ` ${denominationHint}` : ''} (${Math.round(confidence * 100)}%)`
              : 'No cash'}
          </span>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full aspect-video object-cover"
        muted
        playsInline
        style={{ display: active ? 'block' : 'none' }}
      />

      {/* Start prompt */}
      {!active && (
        <div className="flex flex-col items-center justify-center gap-3 h-48 text-white/60">
          <Video className="h-8 w-8 opacity-40" />
          {error ? (
            <p className="text-xs text-red-400 text-center px-4">{error}</p>
          ) : (
            <p className="text-sm">Counter webcam</p>
          )}
          <Button variant="secondary" size="sm" onClick={startCamera}>
            Start Camera
          </Button>
        </div>
      )}

      {/* Stop button */}
      {active && (
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <Button variant="destructive" size="sm" onClick={stopCamera}>
            <VideoOff className="h-3.5 w-3.5 mr-1" />
            Stop
          </Button>
        </div>
      )}

      {/* Face-transaction tracker (invisible AI component) */}
      <FaceTransactionTracker
        videoRef={videoRef}
        active={active}
        onRegistry={onRegistry}
      />
    </div>
  );
}
