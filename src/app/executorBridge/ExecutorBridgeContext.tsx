import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  APP_SETTINGS_CHANGED_EVENT,
  type BridgeMethodId,
  readAppSettings,
} from "../appSettings";
import { isTauriApp } from "../tauriEnv";
import { MacSploitManager } from "./MacSploitManager";

export type BridgeStatus = {
  listening: boolean;
  connected: boolean;
  client: { client: string; version: number } | null;
  last_error: string | null;
  matcha_connected: boolean;
  /** HTTP-polling Port Bridge: routes mounted on the Axum app under /port_bridge/*. */
  port_listening: boolean;
  /** HTTP-polling Port Bridge: a client polled within the liveness window. */
  port_connected: boolean;
  /** HTTP-polling Port Bridge: hello payload from the attached client. */
  port_client: { client: string; version: number } | null;
};

type ExecuteResult = { id: string; ok: boolean; error?: string | null };
export type BridgeLogEntry = { ts: number; level: "info" | "warn" | "error"; message: string };

export type ExecutorBridgeValue = {
  /** Attach button clicked (even if animation not yet completed). */
  attachClicked: boolean;
  /** Attach button + animation completed; we can now bind to bridge connection. */
  attachArmed: boolean;
  /** Underlying WS client connected. */
  connected: boolean;
  /** UI considers itself “attached” (armed + connected). */
  attached: boolean;
  status: BridgeStatus | null;
  logs: BridgeLogEntry[];
  clearLogs: () => void;
  markAttachClicked: () => void;
  armAfterAttachAnimation: () => void;
  execute: (source: string) => Promise<{ ok: true; id: string } | { ok: false; message: string }>;
};

const ExecutorBridgeContext = createContext<ExecutorBridgeValue | null>(null);

function isMethodConnected(method: BridgeMethodId, st: BridgeStatus | null): boolean {
  if (!st) return false;
  if (method === "port") return !!st.port_connected;
  return !!st.connected || !!st.matcha_connected;
}

function isTcpExecutorMethod(method: BridgeMethodId): boolean {
  return method === "macos" || method === "macsploit" || method === "opiumware" || method === "simulation";
}

export function ExecutorBridgeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [attachClicked, setAttachClicked] = useState(false);
  const [attachArmed, setAttachArmed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [attached, setAttached] = useState(false);
  const [logs, setLogs] = useState<BridgeLogEntry[]>([]);
  const [bridgeMethod, setBridgeMethod] = useState<BridgeMethodId>(() => readAppSettings().bridgeMethod);
  const pendingExecRef = useRef(new Map<string, (r: ExecuteResult) => void>());
  const wasConnectedRef = useRef(false);
  const statusRef = useRef<BridgeStatus | null>(null);
  const methodRef = useRef<BridgeMethodId>(bridgeMethod);

  // MacSploit management
  const [macStatus, setMacStatus] = useState(() => MacSploitManager.getInstance().getStatus());
  const macManager = MacSploitManager.getInstance();

  useEffect(() => {
    methodRef.current = bridgeMethod;
    if (isTcpExecutorMethod(bridgeMethod)) {
      void macManager.initialize(bridgeMethod === "simulation" ? "simulation" : "macos");

      const syncConnection = () => {
        const current = macManager.getStatus();
        setMacStatus((prev) => ({
          ...prev,
          connected: current.connected,
          connecting: current.connecting,
          port: current.port,
          simulation: current.simulation,
        }));
        setConnected(current.connected);
      };

      const syncLogs = () => {
        setMacStatus((prev) => ({ ...prev, logs: macManager.getStatus().logs }));
      };

      macManager.addEventListener("attached", syncConnection);
      macManager.addEventListener("detached", syncConnection);
      macManager.addEventListener("reconnecting", syncConnection);
      macManager.addEventListener("logs-updated", syncLogs);

      syncConnection();
      syncLogs();

      return () => {
        macManager.removeEventListener("attached", syncConnection);
        macManager.removeEventListener("detached", syncConnection);
        macManager.removeEventListener("reconnecting", syncConnection);
        macManager.removeEventListener("logs-updated", syncLogs);
        macManager.cleanup();
      };
    } else {
      /* Re-evaluate connection state when the user flips the dropdown — the
       * underlying servers are unchanged, only the UI's "what does connected
       * mean?" did. */
      const isUp = isMethodConnected(bridgeMethod, statusRef.current);
      setConnected(isUp);
      wasConnectedRef.current = isUp;
    }
  }, [bridgeMethod, macManager]);

  useEffect(() => {
    const refresh = () => setBridgeMethod(readAppSettings().bridgeMethod);
    window.addEventListener(APP_SETTINGS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(APP_SETTINGS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const syncStatus = useCallback(async () => {
    if (!isTauriApp()) return;
    if (isTcpExecutorMethod(methodRef.current)) return;
    try {
      const st = await invoke<BridgeStatus>("bridge_status");
      setStatus(st);
      statusRef.current = st;
      const isUp = isMethodConnected(methodRef.current, st);
      setConnected(isUp);
      wasConnectedRef.current = isUp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const fallback: BridgeStatus = {
        listening: false,
        connected: false,
        client: null,
        last_error: msg,
        matcha_connected: false,
        port_listening: false,
        port_connected: false,
        port_client: null,
      };
      setStatus(fallback);
      statusRef.current = fallback;
      setConnected(false);
      wasConnectedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isTauriApp()) return;
    if (isTcpExecutorMethod(bridgeMethod)) return;
    void syncStatus();
    let unlistenStatus: (() => void) | undefined;
    let unlistenExec: (() => void) | undefined;
    let unlistenLog: (() => void) | undefined;
    void (async () => {
      unlistenStatus = await listen<BridgeStatus>("synapse:bridge-status", (ev) => {
        if (isTcpExecutorMethod(methodRef.current)) return;
        const st = ev.payload;
        setStatus(st);
        statusRef.current = st;
        const isUp = isMethodConnected(methodRef.current, st);
        setConnected(isUp);
        wasConnectedRef.current = isUp;
      });
      unlistenExec = await listen<ExecuteResult>("synapse:bridge-execute-result", (ev) => {
        if (isTcpExecutorMethod(methodRef.current)) return;
        const r = ev.payload;
        const cb = pendingExecRef.current.get(r.id);
        if (cb) {
          pendingExecRef.current.delete(r.id);
          cb(r);
        }
      });

      unlistenLog = await listen<{ level: string; message: string }>("synapse:bridge-log", (ev) => {
        if (isTcpExecutorMethod(methodRef.current)) return;
        const lvl =
          ev.payload.level === "error" ? "error" : ev.payload.level === "warn" ? "warn" : "info";
        const entry: BridgeLogEntry = { ts: Date.now(), level: lvl, message: String(ev.payload.message ?? "") };
        setLogs((prev) => {
          const next = [...prev, entry];
          return next.length > 800 ? next.slice(next.length - 800) : next;
        });
      });
    })();
    return () => {
      try {
        unlistenStatus?.();
        unlistenExec?.();
        unlistenLog?.();
      } catch {
        /* ignore */
      }
    };
  }, [syncStatus, bridgeMethod]);

  useEffect(() => {
    setAttached(attachArmed && connected);
  }, [attachArmed, connected]);

  const clearLogs = useCallback(() => {
    if (isTcpExecutorMethod(bridgeMethod)) {
      macManager.clearLogs();
    } else {
      setLogs([]);
    }
  }, [bridgeMethod, macManager]);

  const armAfterAttachAnimation = useCallback(() => {
    setAttachArmed(true);
  }, []);

  const markAttachClicked = useCallback(() => {
    setAttachClicked(true);
    if (isTcpExecutorMethod(bridgeMethod)) {
      void macManager.manualAttach();
    }
  }, [bridgeMethod, macManager]);

  const execute = useCallback(async (source: string) => {
    const body = source ?? "";
    if (!body.trim()) return { ok: false as const, message: "No script to execute." };
    
    // Allow simulation mode without tauri sandbox restriction
    if (bridgeMethod === "simulation") {
      const res = await macManager.execute(body);
      if (res.ok) return { ok: true as const, id: "sim_exec" };
      return { ok: false as const, message: res.message ?? "Simulation execution failed." };
    }

    if (!isTauriApp()) return { ok: false as const, message: "Bridge is desktop-only." };
    if (!attachClicked) return { ok: false as const, message: "Click Attach first." };
    if (!attachArmed) return { ok: false as const, message: "Attaching… wait for the attach animation to finish." };

    if (isTcpExecutorMethod(bridgeMethod)) {
      const res = await macManager.execute(body);
      if (res.ok) return { ok: true as const, id: "macos_exec" };
      return { ok: false as const, message: res.message ?? "macOS executor execution failed." };
    }

    if (!connected) {
      const luaName = bridgeMethod === "port" ? "Port Bridge.lua" : "Websocket Bridge.lua";
      return {
        ok: false as const,
        message: `Bridge not connected. Run \`${luaName}\` in your executor to connect the ${bridgeMethod === "port" ? "Port" : "WebSocket"} bridge.`,
      };
    }
    try {
      const id = await invoke<string>("bridge_send_execute", { source: body, method: bridgeMethod });
      // Wait briefly for a result; executors may not send acks—treat that as success once sent.
      const res = await new Promise<ExecuteResult | null>((resolve) => {
        const t = window.setTimeout(() => resolve(null), 2500);
        pendingExecRef.current.set(id, (r) => {
          window.clearTimeout(t);
          resolve(r);
        });
      });
      if (!res) return { ok: true as const, id };
      if (res.ok) return { ok: true as const, id };
      return { ok: false as const, message: res.error ?? "Execution failed." };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
    }
  }, [attachClicked, attachArmed, connected, bridgeMethod, macManager]);

  const resolvedLogs = useMemo(() => {
    if (isTcpExecutorMethod(bridgeMethod)) {
      return macStatus.logs;
    }
    return logs;
  }, [bridgeMethod, logs, macStatus.logs]);

  const value = useMemo<ExecutorBridgeValue>(
    () => ({
      attachClicked,
      attachArmed,
      connected,
      attached,
      status,
      logs: resolvedLogs,
      clearLogs,
      markAttachClicked,
      armAfterAttachAnimation,
      execute,
    }),
    [
      attachClicked,
      attachArmed,
      connected,
      attached,
      status,
      resolvedLogs,
      clearLogs,
      markAttachClicked,
      armAfterAttachAnimation,
      execute,
    ],
  );

  return <ExecutorBridgeContext.Provider value={value}>{children}</ExecutorBridgeContext.Provider>;
}

export function useExecutorBridge(): ExecutorBridgeValue {
  const ctx = useContext(ExecutorBridgeContext);
  if (!ctx) throw new Error("useExecutorBridge must be used within ExecutorBridgeProvider");
  return ctx;
}
