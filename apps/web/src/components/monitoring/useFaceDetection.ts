/**
 * useFaceDetection — real-time face/person detection on a <video> element.
 *
 * Uses the W3C Shape Detection API (FaceDetector) which is built into
 * Chrome/Edge/Android WebView — zero package overhead, hardware-accelerated.
 *
 * Falls back gracefully on Firefox (faceCount always 0, isSupported = false).
 *
 * Runs at MAX_FPS to avoid burning CPU. Returns:
 *   faceCount    — number of faces currently visible
 *   isSupported  — false on Firefox
 *   isLoading    — true until first detection cycle completes
 *
 * Callers can use faceCount > 0 (person at counter) or
 * watch for faceCount transitions (person arrived / left).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const INTERVAL_MS = 1_000; // run detection at ~1 fps (face detection is expensive)

interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
}

interface Options {
  enabled?: boolean;
  onFaceArrived?:  (count: number) => void;
  onFaceLeft?:     () => void;
}

// Extend Window to expose FaceDetector (Chrome-only API)
declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
      detect(image: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<DetectedFace[]>;
    };
  }
}

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: Options = {},
) {
  const { enabled = true, onFaceArrived, onFaceLeft } = options;

  const [faceCount,   setFaceCount]   = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSupported, setIsSupported] = useState(false);

  const detectorRef    = useRef<InstanceType<NonNullable<Window['FaceDetector']>> | null>(null);
  const prevCountRef   = useRef(0);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const onArrivedRef   = useRef(onFaceArrived);
  const onLeftRef      = useRef(onFaceLeft);
  onArrivedRef.current = onFaceArrived;
  onLeftRef.current    = onFaceLeft;

  // Initialise detector once
  useEffect(() => {
    if (!('FaceDetector' in window)) {
      setIsLoading(false);
      return;
    }
    try {
      detectorRef.current = new window.FaceDetector!({ fastMode: true, maxDetectedFaces: 5 });
      setIsSupported(true);
    } catch {
      // API present but constructor threw (some older versions)
    }
    setIsLoading(false);
  }, []);

  const detect = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !detectorRef.current) return;
    try {
      const faces = await detectorRef.current.detect(video);
      const count = faces.length;
      setFaceCount(count);

      if (count > 0 && prevCountRef.current === 0) {
        onArrivedRef.current?.(count);
      } else if (count === 0 && prevCountRef.current > 0) {
        onLeftRef.current?.();
      }
      prevCountRef.current = count;
    } catch {
      // video not ready or detector error — ignore
    }
  }, [videoRef]);

  useEffect(() => {
    if (!enabled || !isSupported) return;
    intervalRef.current = setInterval(detect, INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled, isSupported, detect]);

  return { faceCount, isSupported, isLoading };
}
