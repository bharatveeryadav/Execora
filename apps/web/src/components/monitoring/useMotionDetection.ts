/**
 * useMotionDetection — canvas pixel-diff motion detection on a <video> element.
 *
 * Samples one frame every INTERVAL_MS, compares to the previous frame.
 * If more than PIXEL_THRESHOLD fraction of pixels changed by more than
 * DIFF_THRESHOLD intensity, motion is detected.
 *
 * Returns:
 *   motionLevel   — 0.0–1.0 fraction of changed pixels (for visualisation)
 *   motionDetected — boolean, debounced: stays true for COOL_DOWN_MS after last motion
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const INTERVAL_MS    = 500;   // sample every 500 ms
const DIFF_THRESHOLD = 30;    // per-channel intensity diff to count as changed
const PIXEL_THRESHOLD = 0.03; // 3% of pixels must change to count as motion
const COOL_DOWN_MS   = 3_000; // stay "detected" for 3 s after last trigger

interface Options {
  enabled?: boolean;
  onMotion?: (level: number) => void;
}

export function useMotionDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: Options = {},
) {
  const { enabled = true, onMotion } = options;
  const [motionLevel, setMotionLevel]       = useState(0);
  const [motionDetected, setMotionDetected] = useState(false);

  const prevDataRef   = useRef<Uint8ClampedArray | null>(null);
  const canvasRef     = useRef<HTMLCanvasElement | null>(null);
  const coolDownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const onMotionRef   = useRef(onMotion);
  onMotionRef.current = onMotion;

  const sample = useCallback(() => {
    const video  = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Downsample to 160×120 for performance
    const W = 160, H = 120;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width  = W;
      canvasRef.current.height = H;
    }
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, W, H);
    const curr = ctx.getImageData(0, 0, W, H).data; // RGBA flat array

    if (prevDataRef.current && prevDataRef.current.length === curr.length) {
      const prev = prevDataRef.current;
      let changed = 0;
      const total = W * H;
      for (let i = 0; i < curr.length; i += 4) {
        const dr = Math.abs(curr[i]     - prev[i]);
        const dg = Math.abs(curr[i + 1] - prev[i + 1]);
        const db = Math.abs(curr[i + 2] - prev[i + 2]);
        if (dr > DIFF_THRESHOLD || dg > DIFF_THRESHOLD || db > DIFF_THRESHOLD) changed++;
      }
      const level = changed / total;
      setMotionLevel(level);

      if (level >= PIXEL_THRESHOLD) {
        setMotionDetected(true);
        onMotionRef.current?.(level);
        if (coolDownTimer.current) clearTimeout(coolDownTimer.current);
        coolDownTimer.current = setTimeout(() => setMotionDetected(false), COOL_DOWN_MS);
      }
    }

    // Store a copy (curr is a view into a reused buffer so we must slice)
    prevDataRef.current = curr.slice();
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) {
      prevDataRef.current = null;
      setMotionLevel(0);
      setMotionDetected(false);
      return;
    }
    intervalRef.current = setInterval(sample, INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (coolDownTimer.current) clearTimeout(coolDownTimer.current);
    };
  }, [enabled, sample]);

  return { motionLevel, motionDetected };
}
