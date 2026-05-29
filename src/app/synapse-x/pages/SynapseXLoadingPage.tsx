import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { setMainWindowSize } from "@/app/synapse-original/windowOps";
import { centerWindowOnCurrentMonitor } from "@/app/windowPlacement";
import SynapseXChrome from "@/app/synapse-x/SynapseXChrome";
import { SYNAPSE_X_SIZES } from "@/app/synapse-x/windowOps";

const SHOW_MS = 2200;

/** Port of WPF `LoadWindow` — fake progress only; then `/synapse-x/main`. */
export default function SynapseXLoadingPage() {
  const navigate = useNavigate();
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState<"in" | "out">("in");
  const doneRef = useRef(false);

  useEffect(() => {
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      try {
        await getCurrentWindow().setMinSize(null);
      } catch { /* ignore */ }
      const { width, height } = SYNAPSE_X_SIZES.loading;
      await setMainWindowSize(width, height);
      try {
        await centerWindowOnCurrentMonitor();
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const t0 = performance.now();
    const iv = window.setInterval(() => {
      if (doneRef.current) return;
      const t = (performance.now() - t0) / SHOW_MS;
      const next = Math.min(100, Math.round(t * 100 + Math.sin(t * 12) * 3));
      setPct(next);
      
      if (t >= 1 && next >= 100) {
        doneRef.current = true;
        window.clearInterval(iv);
        
        setStage("out");
        setTimeout(() => {
          navigate("/synapse-x/main", { replace: true });
        }, 500);
      }
    }, 48);
    return () => window.clearInterval(iv);
  }, [navigate]);

  const wPx = Math.round((387 * pct) / 100);

  return (
    <div 
      className="h-full w-[418px] overflow-hidden transition-opacity duration-500 ease-in-out"
      style={{ opacity: stage === "in" ? 1 : 0 }}
    >
      <SynapseXChrome title="Synapse X - Loader" variant="loader">
        <div className="relative px-[19px] pt-2.5">
          <p className="mb-3 text-center text-[14px] text-white">Initializing...</p>
          <div className="relative h-[21px] w-[387px] bg-[#2d2d2d]">
            <div
              className="absolute left-0 top-0 h-full bg-[#5a9e5f]"
              style={{ width: wPx }}
            />
          </div>
        </div>
      </SynapseXChrome>
    </div>
  );
}
