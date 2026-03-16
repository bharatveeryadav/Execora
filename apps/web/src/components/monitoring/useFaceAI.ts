/**
 * useFaceAI — Real face detection + 128-dim descriptor extraction.
 *
 * Uses @vladmandic/face-api (TensorFlow.js-based):
 *   - tinyFaceDetector    ~190 KB  — fast face detection
 *   - faceLandmark68Tiny  ~80 KB   — alignment before descriptor
 *   - faceRecognition     ~6.2 MB  — 128-dim embedding (same as dlib)
 *
 * Models loaded from jsDelivr CDN on first use; browser caches permanently.
 *
 * Re-identification: euclidean distance < 0.55 between descriptors = same person.
 *
 * Returns per frame:
 *   faces: DetectedFace[]     — current faces with box + descriptor + thumbnail
 *   isReady: boolean           — models loaded and running
 *   isLoading: boolean         — models still downloading
 *   error: string | null       — fatal error (WASM unsupported, etc.)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type * as FaceApiType from '@vladmandic/face-api';

const MODEL_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/';
const INTERVAL_MS = 900;

export interface DetectedFace {
  /** Bounding box in video pixel coords */
  box: { x: number; y: number; width: number; height: number };
  /** 128-dim face embedding — use euclidean distance for re-id */
  descriptor: Float32Array;
  /** 64×64 JPEG base64 crop — for display */
  thumbnail: string;
  /** Confidence score 0–1 */
  score: number;
}

interface Options {
  enabled?: boolean;
  onFace?: (faces: DetectedFace[]) => void;
}

let faceapi: typeof FaceApiType | null = null;
let modelsLoading: Promise<void> | null = null;

async function loadModelsOnce(): Promise<void> {
  if (faceapi) return;
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    const fa = await import('@vladmandic/face-api');
    faceapi = fa;
    await Promise.all([
      fa.nets.tinyFaceDetector.loadFromUri(MODEL_CDN),
      fa.nets.faceLandmark68TinyNet.loadFromUri(MODEL_CDN),
      fa.nets.faceRecognitionNet.loadFromUri(MODEL_CDN),
    ]);
  })();

  return modelsLoading;
}

/** Crop the face region from the video onto a 64×64 canvas and return base64 JPEG */
function cropFaceThumbnail(
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
): string {
  const c = document.createElement('canvas');
  c.width  = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  // Add 20% padding around face
  const pad = Math.min(box.width, box.height) * 0.2;
  const sx  = Math.max(0, box.x - pad);
  const sy  = Math.max(0, box.y - pad);
  const sw  = Math.min(video.videoWidth  - sx, box.width  + pad * 2);
  const sh  = Math.min(video.videoHeight - sy, box.height + pad * 2);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 64, 64);
  return c.toDataURL('image/jpeg', 0.7);
}

export function useFaceAI(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: Options = {},
) {
  const { enabled = true, onFace } = options;

  const [faces,     setFaces]     = useState<DetectedFace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady,   setIsReady]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFaceRef   = useRef(onFace);
  onFaceRef.current = onFace;

  // Load models once
  useEffect(() => {
    if (!enabled) return;
    setIsLoading(true);
    loadModelsOnce()
      .then(() => { setIsReady(true); setIsLoading(false); })
      .catch((e) => {
        setError(`Failed to load face AI models: ${e?.message ?? e}`);
        setIsLoading(false);
      });
  }, [enabled]);

  const detect = useCallback(async () => {
    if (!faceapi || !isReady) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    try {
      const results = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)   // tiny landmarks
        .withFaceDescriptors();

      const detected: DetectedFace[] = results.map((r) => ({
        box:        { x: r.detection.box.x, y: r.detection.box.y, width: r.detection.box.width, height: r.detection.box.height },
        descriptor: r.descriptor,
        thumbnail:  cropFaceThumbnail(video, r.detection.box),
        score:      r.detection.score,
      }));

      setFaces(detected);
      if (detected.length > 0) onFaceRef.current?.(detected);
    } catch {
      // video frame may not be ready — silent ignore
    }
  }, [videoRef, isReady]);

  useEffect(() => {
    if (!enabled || !isReady) return;
    intervalRef.current = setInterval(detect, INTERVAL_MS);
    return () => { intervalRef.current && clearInterval(intervalRef.current); };
  }, [enabled, isReady, detect]);

  useEffect(() => {
    if (!enabled) {
      intervalRef.current && clearInterval(intervalRef.current);
      setFaces([]);
    }
  }, [enabled]);

  return { faces, isReady, isLoading, error };
}

// ── Re-identification utility ─────────────────────────────────────────────────

/** Euclidean distance between two 128-dim face descriptors */
export function descriptorDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/** 0.55 is the standard threshold — below = same person */
export const SAME_PERSON_THRESHOLD = 0.55;
