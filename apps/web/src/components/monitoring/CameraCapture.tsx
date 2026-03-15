/**
 * CameraCapture — hidden component that lives on the counter device.
 *
 * Listens for `execora:capture-snap` custom DOM events fired by
 * ClassicBilling / InvoiceCreation after a transaction completes.
 * Captures a JPEG frame from the active camera stream and uploads
 * it to POST /api/v1/monitoring/snap.
 *
 * Usage: render once inside AppLayout (or Monitoring page).
 * Other components trigger a snap by firing:
 *   window.dispatchEvent(new CustomEvent('execora:capture-snap', {
 *     detail: { eventType, entityType, entityId, description }
 *   }))
 */
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { getToken } from '@/lib/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

interface SnapDetail {
  eventType: string;
  entityType: string;
  entityId: string;
  description?: string;
}

export function CameraCapture() {
  const streamRef  = useRef<MediaStream | null>(null);
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const busyRef    = useRef(false);

  const { data } = useQuery({
    queryKey: ['monitoring', 'config'],
    queryFn:  () => monitoringApi.getConfig(),
    staleTime: 5 * 60_000,
  });

  const config = data?.config;

  // Start / stop camera stream based on config
  useEffect(() => {
    if (!config?.cameraEnabled || config.cameraSource !== 'webcam') {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {/* ignore autoplay */});
        }
      })
      .catch(() => {/* camera unavailable */});

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [config?.cameraEnabled, config?.cameraSource]);

  // Listen for snap trigger events
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent<SnapDetail>).detail;
      if (!config?.cameraEnabled) return;
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        let blob: Blob | null = null;

        if (config.cameraSource === 'webcam' && streamRef.current && videoRef.current && canvasRef.current) {
          const video  = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width  = video.videoWidth  || 640;
          canvas.height = video.videoHeight || 480;
          canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
          blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.75));
        }

        if (!blob) return;

        const fd = new FormData();
        fd.append('snap', blob, 'snap.jpg');
        fd.append('eventType',  detail.eventType);
        fd.append('entityType', detail.entityType);
        fd.append('entityId',   detail.entityId);
        if (detail.description) fd.append('description', detail.description);

        await fetch(`${API_BASE}/api/v1/monitoring/snap`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken() ?? ''}` },
          body: fd,
        });
      } catch {
        // fire-and-forget — never break billing
      } finally {
        busyRef.current = false;
      }
    };

    window.addEventListener('execora:capture-snap', handler);
    return () => window.removeEventListener('execora:capture-snap', handler);
  }, [config?.cameraEnabled, config?.cameraSource]);

  // Hidden DOM nodes — camera stream + offscreen canvas
  return (
    <>
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
}

/** Fire a snap capture from anywhere in the app */
export function triggerSnap(detail: SnapDetail) {
  window.dispatchEvent(new CustomEvent('execora:capture-snap', { detail }));
}
