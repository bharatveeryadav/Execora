/**
 * useCashDetection — Real-time Indian currency note detection via camera.
 *
 * Algorithm (pure canvas, zero ML libraries):
 *   1. Sample video at 160×120 every 350ms
 *   2. Convert each pixel RGB → HSV
 *   3. Classify pixels:
 *        - denomination-color  (each RBI note has a distinct dominant color)
 *        - skin-tone           (hand present = someone handling something)
 *   4. If currency-colored pixels > 4% of frame AND skin pixels > 2% → "cash visible"
 *   5. When cash transitions from not-visible → visible: fire onCashDetected
 *   6. denominationHint: whichever denomination color is most prevalent
 *
 * Denomination colors (RBI issued):
 *   ₹10  — chocolate brown      H 12–35°
 *   ₹20  — greenish-yellow      H 52–78°
 *   ₹50  — fluorescent teal     H 160–205°
 *   ₹100 — lavender             H 238–272°
 *   ₹200 — bright yellow        H 40–58°, S>0.65
 *   ₹500 — stone grey-green     H 118–168°, S<0.45
 *   ₹2000— magenta-pink         H 285–330°
 *
 * Skin tone: H 0–30°, S 0.18–0.78, V 0.32–0.92
 *
 * Returns:
 *   cashDetected    — true when a note + hand are in frame right now
 *   denominationHint— "₹500" / "₹100" etc., or null
 *   confidence      — 0–1 (fraction of currency pixels)
 *   skinPresent     — hand/skin detected independently
 *   isActive        — hook is running
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const INTERVAL_MS      = 350;
const CANVAS_W         = 160;
const CANVAS_H         = 120;
const TOTAL_PX         = CANVAS_W * CANVAS_H;
const CASH_THRESH      = 0.04;   // 4% of pixels must be currency-colored
const SKIN_THRESH      = 0.02;   // 2% of pixels must be skin-tone
const COOLDOWN_MS      = 2_000;  // debounce re-trigger

/** Convert 0-255 RGB to HSV (H: 0-360, S: 0-1, V: 0-1) */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d   = max - min;
  const v   = max;
  const s   = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }
  return [h, s, v];
}

type DenomKey = '₹10' | '₹20' | '₹50' | '₹100' | '₹200' | '₹500' | '₹2000';

interface DenomRange {
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
}

const DENOM_RANGES: Record<DenomKey, DenomRange> = {
  '₹10':   { hMin: 12,  hMax: 35,  sMin: 0.30, sMax: 0.90, vMin: 0.28, vMax: 0.82 },
  '₹20':   { hMin: 52,  hMax: 78,  sMin: 0.45, sMax: 1.00, vMin: 0.48, vMax: 0.92 },
  '₹50':   { hMin: 160, hMax: 205, sMin: 0.48, sMax: 1.00, vMin: 0.38, vMax: 0.92 },
  '₹100':  { hMin: 238, hMax: 272, sMin: 0.18, sMax: 0.68, vMin: 0.48, vMax: 0.92 },
  '₹200':  { hMin: 40,  hMax: 58,  sMin: 0.65, sMax: 1.00, vMin: 0.65, vMax: 1.00 },
  '₹500':  { hMin: 118, hMax: 168, sMin: 0.06, sMax: 0.45, vMin: 0.28, vMax: 0.72 },
  '₹2000': { hMin: 285, hMax: 330, sMin: 0.38, sMax: 0.95, vMin: 0.28, vMax: 0.85 },
};

function inRange(v: number, min: number, max: number) { return v >= min && v <= max; }

function classifyPixel(h: number, s: number, v: number): DenomKey | 'skin' | null {
  // Skin tone
  if (inRange(h, 0, 30) && inRange(s, 0.18, 0.78) && inRange(v, 0.32, 0.92)) return 'skin';

  // Check each denomination
  for (const [key, r] of Object.entries(DENOM_RANGES)) {
    if (inRange(h, r.hMin, r.hMax) && inRange(s, r.sMin, r.sMax) && inRange(v, r.vMin, r.vMax)) {
      return key as DenomKey;
    }
  }
  return null;
}

interface Options {
  enabled?: boolean;
  onCashDetected?: (denom: DenomKey | null, confidence: number) => void;
  onCashLeft?: () => void;
}

export function useCashDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: Options = {},
) {
  const { enabled = true, onCashDetected, onCashLeft } = options;

  const [cashDetected,      setCashDetected]      = useState(false);
  const [denominationHint,  setDenominationHint]  = useState<DenomKey | null>(null);
  const [confidence,        setConfidence]        = useState(0);
  const [skinPresent,       setSkinPresent]       = useState(false);

  const canvasRef        = useRef<HTMLCanvasElement | null>(null);
  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTriggerRef   = useRef(0);
  const prevDetectedRef  = useRef(false);
  const onDetectedRef    = useRef(onCashDetected);
  const onLeftRef        = useRef(onCashLeft);
  onDetectedRef.current  = onCashDetected;
  onLeftRef.current      = onCashLeft;

  // Create off-DOM canvas once
  useEffect(() => {
    const c = document.createElement('canvas');
    c.width  = CANVAS_W;
    c.height = CANVAS_H;
    canvasRef.current = c;
    return () => { canvasRef.current = null; };
  }, []);

  const analyse = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState < 2 || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);
    const { data } = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);

    const denomCounts: Record<string, number> = {};
    let skinCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      const cls = classifyPixel(h, s, v);
      if (cls === 'skin') {
        skinCount++;
      } else if (cls !== null) {
        denomCounts[cls] = (denomCounts[cls] ?? 0) + 1;
      }
    }

    // Dominant denom
    let topDenom: DenomKey | null = null;
    let topCount = 0;
    for (const [d, c] of Object.entries(denomCounts)) {
      if (c > topCount) { topCount = c; topDenom = d as DenomKey; }
    }

    const cashRatio = topCount / TOTAL_PX;
    const skinRatio = skinCount / TOTAL_PX;
    const detected  = cashRatio >= CASH_THRESH && skinRatio >= SKIN_THRESH;

    setConfidence(Math.min(cashRatio * 10, 1)); // scale for display
    setSkinPresent(skinRatio >= SKIN_THRESH);
    setCashDetected(detected);
    if (detected) setDenominationHint(topDenom);

    // Transition events
    if (detected && !prevDetectedRef.current) {
      const now = Date.now();
      if (now - lastTriggerRef.current >= COOLDOWN_MS) {
        lastTriggerRef.current = now;
        onDetectedRef.current?.(topDenom, cashRatio);
      }
    } else if (!detected && prevDetectedRef.current) {
      onLeftRef.current?.();
    }
    prevDetectedRef.current = detected;
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) {
      intervalRef.current && clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(analyse, INTERVAL_MS);
    return () => { intervalRef.current && clearInterval(intervalRef.current); };
  }, [enabled, analyse]);

  return { cashDetected, denominationHint, confidence, skinPresent };
}
