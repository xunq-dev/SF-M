import { useEffect, useState } from "react";

const DOTS = [".", "..", "..."] as const;

/**
 * Cycles ".", "..", "..." on a fixed cadence (default 500ms per step → 1.5s full loop).
 * Used by the Synapse Original loading screen "[ Loading… ]" copy.
 */
export function useEllipsisCycle(active: boolean, stepMs = 500): string {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    const id = window.setInterval(() => {
      setPhase((p) => (p + 1) % DOTS.length);
    }, stepMs);
    return () => window.clearInterval(id);
  }, [active, stepMs]);

  return active ? DOTS[phase]! : "";
}
