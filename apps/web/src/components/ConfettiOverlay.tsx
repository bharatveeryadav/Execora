import { useState, useCallback, useEffect, useRef } from "react";

// Confetti particle colours
const COLORS = [
  "#f43f5e", "#fb923c", "#facc15", "#4ade80",
  "#34d399", "#60a5fa", "#a78bfa", "#f472b6",
];

interface Particle {
  id: number;
  x: number;        // % from left
  color: string;
  size: number;     // px
  delay: number;    // ms
  duration: number; // ms
  rotation: number;
  shape: "rect" | "circle";
}

function makeParticles(count = 80): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 6,
    delay: Math.random() * 600,
    duration: Math.random() * 1000 + 1500,
    rotation: Math.random() * 360,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));
}

// Global confetti state — singleton so Payment.tsx can fire it from anywhere
type ConfettiListener = () => void;
const listeners = new Set<ConfettiListener>();

export function fireConfetti() {
  listeners.forEach((fn) => fn());
}

/** Drop this hook in any component that should react to fireConfetti() */
export function useConfetti() {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(false), 3200);
  }, []);

  useEffect(() => {
    listeners.add(trigger);
    return () => { listeners.delete(trigger); };
  }, [trigger]);

  return active;
}

/** Mount once near the app root (e.g. Index.tsx or App.tsx) */
export function ConfettiOverlay() {
  const active = useConfetti();
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) setParticles(makeParticles(80));
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-20px",
            width: p.size,
            height: p.shape === "rect" ? p.size * 0.5 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}ms ${p.delay}ms linear forwards`,
          }}
        />
      ))}
    </div>
  );
}
