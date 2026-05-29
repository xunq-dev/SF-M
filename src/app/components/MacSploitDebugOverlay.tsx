import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useExecutorBridge } from "../executorBridge/ExecutorBridgeContext";
import { MacSploitManager, type LogEntry } from "../executorBridge/MacSploitManager";
import { Activity, ShieldAlert, Sparkles, Terminal, X } from "lucide-react";
import { readAppSettings } from "../appSettings";

export default function MacSploitDebugOverlay() {
  const bridge = useExecutorBridge();
  const [minimized, setMinimized] = useState(false);
  const [macStatus, setMacStatus] = useState(() => MacSploitManager.getInstance().getStatus());
  const [settings, setSettings] = useState(() => readAppSettings());
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  const manager = MacSploitManager.getInstance();

  useEffect(() => {
    const sync = () => {
      setMacStatus(manager.getStatus());
      setSettings(readAppSettings());
    };
    
    manager.addEventListener("attached", sync);
    manager.addEventListener("detached", sync);
    manager.addEventListener("reconnecting", sync);
    manager.addEventListener("logs-updated", sync);

    // Initial sync
    sync();

    // Listen for options change
    const onSettings = () => setSettings(readAppSettings());
    window.addEventListener("synapse-app-settings-changed", onSettings);

    return () => {
      manager.removeEventListener("attached", sync);
      manager.removeEventListener("detached", sync);
      manager.removeEventListener("reconnecting", sync);
      manager.removeEventListener("logs-updated", sync);
      window.removeEventListener("synapse-app-settings-changed", onSettings);
    };
  }, [manager]);

  // Scroll to bottom of terminal logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [macStatus.logs]);

  const activeMethod = settings.bridgeMethod;
  const isTcpOrSim =
    activeMethod === "macos" || activeMethod === "macsploit" || activeMethod === "opiumware" || activeMethod === "simulation";

  // Hide the debug overlay if we are not using MacSploit, Opiumware, or Simulation methods
  if (!isTcpOrSim) {
    return null;
  }

  const handleAttach = () => {
    void manager.manualAttach();
  };

  const handleDetach = () => {
    void manager.manualDetach();
  };

  const statusColor = macStatus.connected
    ? "bg-emerald-500 shadow-emerald-500/50"
    : macStatus.connecting
    ? "bg-amber-500 animate-pulse shadow-amber-500/50"
    : "bg-rose-500 shadow-rose-500/50";

  const statusText = macStatus.connected
    ? "Attached"
    : macStatus.connecting
    ? "Connecting..."
    : "Detached";
  const methodLabel =
    macStatus.mode === "simulation" ? "Simulation" : macStatus.mode === "opiumware" ? "Opiumware" : "MacSploit";

  return (
    <div className="fixed bottom-4 right-4 z-[200] font-sans">
      <AnimatePresence mode="wait">
        {minimized ? (
          <motion.button
            key="minimized-pill"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setMinimized(false)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl transition hover:bg-black/80"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
            <span>HUD Status: {statusText}</span>
          </motion.button>
        ) : (
          <motion.div
            key="hud-card"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 rounded-2xl border border-white/15 bg-black/50 p-4 text-white shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  macOS Integration HUD
                </span>
              </div>
              <button
                onClick={() => setMinimized(true)}
                className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Info Status Grid */}
            <div className="my-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-white/5 p-2 border border-white/5">
                <p className="text-slate-400">Executor Status</p>
                <div className="mt-1 flex items-center gap-1.5 font-bold">
                  <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                  <span>{statusText}</span>
                </div>
              </div>
              <div className="rounded-lg bg-white/5 p-2 border border-white/5">
                <p className="text-slate-400">Bridge Method</p>
                <p className="mt-1 font-bold text-indigo-300 uppercase">
                  {methodLabel}
                </p>
              </div>
            </div>

            {/* Micro Controls */}
            <div className="mb-3 flex items-center justify-between gap-1.5 text-[10px]">
              <div className="flex gap-1.5">
                {!macStatus.connected && !macStatus.connecting ? (
                  <button
                    onClick={handleAttach}
                    className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 font-semibold hover:bg-indigo-500 transition active:scale-95"
                  >
                    <Activity className="h-3 w-3" /> Attach
                  </button>
                ) : (
                  <button
                    onClick={handleDetach}
                    className="flex items-center gap-1 rounded bg-rose-900/60 px-2.5 py-1 font-semibold border border-rose-500/20 hover:bg-rose-900/90 transition active:scale-95"
                  >
                    <ShieldAlert className="h-3 w-3" /> Detach
                  </button>
                )}
              </div>
              <button
                onClick={() => manager.clearLogs()}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                Clear Log
              </button>
            </div>

            {/* Execution Log Terminal */}
            <div className="rounded-xl border border-white/10 bg-black/60 p-2.5 shadow-inner">
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-1 text-[9px] font-bold text-indigo-400">
                <Terminal className="h-3 w-3" />
                <span>EXECUTION LOGS (250MS RATE)</span>
              </div>
              <div className="synapse-scroll mt-1.5 h-24 overflow-y-auto font-mono text-[9px] leading-relaxed text-slate-300">
                {macStatus.logs.length === 0 ? (
                  <p className="italic text-slate-500">Console is idle. Logs will populate here...</p>
                ) : (
                  macStatus.logs.map((log, index) => {
                    const timeStr = new Date(log.ts).toTimeString().split(" ")[0];
                    const levelColors =
                      log.level === "error"
                        ? "text-rose-400 font-bold"
                        : log.level === "warn"
                        ? "text-amber-400"
                        : "text-slate-300";
                    return (
                      <div key={index} className="flex gap-1.5 py-0.5 border-b border-white/5 last:border-0">
                        <span className="text-slate-500 shrink-0">{timeStr}</span>
                        <span className={`${levelColors} break-all`}>{log.message}</span>
                      </div>
                    );
                  })
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
