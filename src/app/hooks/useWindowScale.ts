import { useEffect, useState } from "react";

/**
 * Calculates a scale factor to fit a fixed-size design into the current window,
 * maintaining aspect ratio and centering if needed.
 */
export function useWindowScale(designWidth: number, designHeight: number, enabled: boolean) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!enabled) {
      setScale(1);
      return;
    }

    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Calculate scale to fit with 20px padding
      const padding = 40;
      const scaleW = (w - padding) / designWidth;
      const scaleH = (h - padding) / designHeight;
      const next = Math.min(scaleW, scaleH, 2.5); // Cap at 2.5x zoom
      setScale(Math.max(0.1, next));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [designWidth, designHeight, enabled]);

  return scale;
}
