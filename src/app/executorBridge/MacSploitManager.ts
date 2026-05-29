import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type MacSploitEvent = "attached" | "detached" | "reconnecting" | "ready";

export interface LogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
}

type TcpExecutorMode = "macsploit" | "opiumware";
type ExecutorMode = "macos" | "simulation";

export class MacSploitManager extends EventTarget {
  private static instance: MacSploitManager | null = null;

  private pollIntervalId: number | null = null;
  private isConnected = false;
  private isConnecting = false;
  private currentPort: number | null = null;
  private executorMode: ExecutorMode = "macos";
  private activeExecutor: TcpExecutorMode = "macsploit";
  private isSimulation = false;
  private logs: LogEntry[] = [];
  private verbose = true;
  private unlistenLog: UnlistenFn | null = null;
  private unlistenStatus: UnlistenFn | null = null;
  private unlistenAltStatus: UnlistenFn | null = null;
  private lastKnownPort: number | null = null;
  private lastKnownExecutor: TcpExecutorMode | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): MacSploitManager {
    if (!MacSploitManager.instance) {
      MacSploitManager.instance = new MacSploitManager();
    }
    return MacSploitManager.instance;
  }

  /**
   * Initializes the polling loops and registers event listeners for Tauri events.
   * Checks current state every 10ms with proper async sequencing to avoid race conditions.
   */
  public async initialize(mode: ExecutorMode) {
    this.cleanup();
    this.executorMode = mode;
    this.isSimulation = mode === "simulation";
    this.logDebug(`Initializing manager in ${mode} mode`);

    if (this.isSimulation) {
      this.startSimulationPoll();
    } else {
      await this.setupTauriListeners();
      this.startRealPoll();
    }
  }

  /**
   * Clears all running intervals, event listeners, and resets local variables.
   * Essential to avoid duplicate intervals or memory leaks on tab/mode switches.
   */
  public cleanup() {
    if (this.pollIntervalId !== null) {
      window.clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.unlistenLog) {
      this.unlistenLog();
      this.unlistenLog = null;
    }
    if (this.unlistenStatus) {
      this.unlistenStatus();
      this.unlistenStatus = null;
    }
    if (this.unlistenAltStatus) {
      this.unlistenAltStatus();
      this.unlistenAltStatus = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.currentPort = null;
    this.lastKnownPort = null;
    this.lastKnownExecutor = null;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      port: this.currentPort,
      simulation: this.isSimulation,
      mode: this.isSimulation ? "simulation" : this.activeExecutor,
      logs: this.logs,
    };
  }

  public clearLogs() {
    this.logs = [];
    this.dispatchEvent(new Event("logs-updated"));
  }

  public setVerbose(enabled: boolean) {
    this.verbose = enabled;
  }

  /**
   * Executes a script via the executor.
   */
  public async execute(script: string): Promise<{ ok: boolean; message?: string }> {
    if (!script || !script.trim()) {
      return { ok: false, message: "No script to execute." };
    }

    if (this.isSimulation) {
      this.logDebug(`[Simulation] Executing: ${script.substring(0, 60)}${script.length > 60 ? "..." : ""}`);
      this.addLog("info", `[SIMULATION] Executing script: ${script.substring(0, 40)}...`);
      
      // Simulate Roblox outputs / errors if script contains them
      setTimeout(() => {
        if (script.includes("error")) {
          this.addLog("error", "LUA ERROR: Script failed with user-thrown error");
        } else {
          this.addLog("info", "Hello World! (simulated print)");
        }
      }, 300);

      return { ok: true };
    }

    if (!(await this.ensureConnected())) {
      return { ok: false, message: "Executor is not attached. Attach first." };
    }

    try {
      await invoke(this.commandName("execute"), { script });
      this.isConnected = true;
      this.isConnecting = false;
      if (this.currentPort) this.lastKnownPort = this.currentPort;
      this.lastKnownExecutor = this.activeExecutor;
      this.logDebug(`Script sent to ${this.executorLabel()} successfully.`);
      return { ok: true };
    } catch (err) {
      const msg = String(err);
      
      // Only disconnect on actual connection errors (port/timeout), not script errors
      const isConnectionError =
        msg.includes("port") ||
        msg.includes("Connection") ||
        msg.includes("timeout") ||
        msg.includes("Not attached") ||
        msg.includes("TCP socket");
      if (isConnectionError) {
        this.isConnected = false;
        this.isConnecting = false;
        this.dispatchEvent(new Event("detached"));
      }

      if (this.lastKnownPort && isConnectionError) {
        try {
          this.addLog("info", `Reconnecting to port ${this.lastKnownPort}…`);
          if (this.lastKnownExecutor) this.activeExecutor = this.lastKnownExecutor;
          await invoke(this.commandName("connect"), { port: this.lastKnownPort });
          await invoke(this.commandName("execute"), { script });
          this.isConnected = true;
          this.currentPort = this.lastKnownPort;
          this.dispatchEvent(new Event("attached"));
          this.dispatchEvent(new Event("ready"));
          this.logDebug("Script sent after reconnect.");
          return { ok: true };
        } catch (retryErr) {
          const retryMsg = String(retryErr);
          this.logDebug(`Retry after reconnect failed: ${retryMsg}`);
          this.addLog("error", `Execution failed: ${retryMsg}`);
          return { ok: false, message: retryMsg };
        }
      }

      this.logDebug(`Execution failed: ${msg}`);
      this.addLog("error", `Execution failed: ${msg}`);
      return { ok: false, message: msg };
    }
  }

  /** Sync Rust connection state; reconnect to last port when the socket dropped. */
  private async ensureConnected(): Promise<boolean> {
    try {
      const macStatus = await this.statusFor("macsploit");
      const opiumStatus = await this.statusFor("opiumware");
      const mode = opiumStatus.connected ? "opiumware" : macStatus.connected ? "macsploit" : this.activeExecutor;
      const status = mode === "opiumware" ? opiumStatus : macStatus;
      this.activeExecutor = mode;

      if (status.connected) {
        this.isConnected = true;
        this.isConnecting = false;
        this.currentPort = status.port;
        if (status.port) this.lastKnownPort = status.port;
        this.lastKnownExecutor = this.activeExecutor;
        return true;
      }

      this.isConnected = false;
      if (status.port) this.lastKnownPort = status.port;
      if (this.lastKnownPort) {
        this.isConnecting = true;
        try {
          if (this.lastKnownExecutor) this.activeExecutor = this.lastKnownExecutor;
          await invoke(this.commandName("connect"), { port: this.lastKnownPort });
          // Wait brief moment for Rust to establish connection
          await new Promise((r) => setTimeout(r, 50));
          const verifyStatus = await invoke<{ connected: boolean; port: number | null; last_error: string | null }>(this.commandName("status"));
          if (verifyStatus.connected) {
            this.isConnected = true;
            this.isConnecting = false;
            this.currentPort = this.lastKnownPort;
            this.lastKnownExecutor = this.activeExecutor;
            this.dispatchEvent(new Event("attached"));
            this.dispatchEvent(new Event("ready"));
            return true;
          }
        } catch (connectErr) {
          this.logDebug(`Reconnect attempt failed: ${connectErr}`);
        }
        this.isConnecting = false;
      }

      return false;
    } catch {
      this.isConnected = false;
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Forces manual attach/connection flow.
   */
  public async manualAttach(): Promise<void> {
    if (this.isConnected || this.isConnecting) return;

    this.isConnecting = true;
    this.dispatchEvent(new Event("reconnecting"));

    if (this.isSimulation) {
      this.addLog("info", "Attaching to simulated executor...");
      await new Promise((r) => setTimeout(r, 600)); // Mock delay
      this.isConnected = true;
      this.isConnecting = false;
      this.currentPort = 9999;
      this.dispatchEvent(new Event("attached"));
      this.dispatchEvent(new Event("ready"));
      this.addLog("info", "Attached to simulated executor on port 9999.");
      return;
    }

    try {
      if (this.lastKnownPort) {
        this.addLog("info", `Reconnecting to port ${this.lastKnownPort}…`);
        try {
          if (this.lastKnownExecutor) this.activeExecutor = this.lastKnownExecutor;
          await invoke(this.commandName("connect"), { port: this.lastKnownPort });
          this.isConnecting = false;
          return;
        } catch {
          this.addLog("warn", `Port ${this.lastKnownPort} unavailable, scanning…`);
        }
      }

      this.addLog("info", "Scanning for active MacSploit or Opiumware instances...");
      const detected = await this.detectActiveExecutor();
      if (!detected) {
        throw new Error("No active MacSploit or Opiumware executor detected. Launch your executor/Roblox.");
      }
      const { mode, port } = detected;
      this.activeExecutor = mode;
      this.lastKnownPort = port;
      this.lastKnownExecutor = mode;
      this.addLog("info", `${this.executorLabel()} instance found on port ${port}. Connecting...`);
      await invoke(this.commandName("connect"), { port });
    } catch (err) {
      this.isConnecting = false;
      this.dispatchEvent(new Event("detached"));
      const msg = String(err);
      this.addLog("error", `Attach failed: ${msg}`);
      this.logDebug(`Attach failed: ${msg}`);
    }
  }

  /**
   * Disconnects the active socket.
   */
  public async manualDetach(): Promise<void> {
    if (this.isSimulation) {
      this.isConnected = false;
      this.isConnecting = false;
      this.currentPort = null;
      this.dispatchEvent(new Event("detached"));
      this.addLog("info", "Simulated executor detached.");
      return;
    }

    try {
      await Promise.allSettled([
        invoke("macsploit_disconnect"),
        invoke("opiumware_disconnect"),
      ]);
      this.addLog("info", "Detached from macOS TCP executor.");
    } catch (err) {
      this.logDebug(`Detach failed: ${err}`);
    }
  }

  // --- Real Connection Loop ---
  private startRealPoll() {
    let isPolling = false;
    const poll = async () => {
      if (isPolling) return; // Skip if already running
      isPolling = true;
      try {
        const macStatus = await this.statusFor("macsploit");
        const opiumStatus = await this.statusFor("opiumware");
        const mode = opiumStatus.connected ? "opiumware" : "macsploit";
        const status = opiumStatus.connected ? opiumStatus : macStatus;
        this.activeExecutor = mode;

        if (status.port) {
          this.lastKnownPort = status.port;
          this.lastKnownExecutor = mode;
        }

        const stateChanged = this.isConnected !== status.connected || this.currentPort !== status.port;
        if (stateChanged) {
          this.isConnected = status.connected;
          this.currentPort = status.port;
          this.isConnecting = false;

          if (this.isConnected) {
            this.dispatchEvent(new Event("attached"));
            this.dispatchEvent(new Event("ready"));
          } else {
            this.dispatchEvent(new Event("detached"));
          }
        }
      } catch (err) {
        this.logDebug(`Polling status error: ${err}`);
        this.isConnected = false;
      } finally {
        isPolling = false;
        this.pollIntervalId = window.setTimeout(poll, 10);
      }
    };
    this.pollIntervalId = window.setTimeout(poll, 10);
  }

  private async setupTauriListeners() {
    // Listen for status change notifications
    this.unlistenStatus = await this.listenForStatus("macsploit");
    this.unlistenAltStatus = await this.listenForStatus("opiumware");
  }

  // --- Simulation Connection Loop ---
  private startSimulationPoll() {
    this.pollIntervalId = window.setInterval(() => {
      // Periodic log to simulate Roblox background activity
      if (this.isConnected && Math.random() < 0.08) {
        const dummyLogs = [
          "GC run completed in 1.4ms",
          "DataModel loaded successfully",
          "CoreScript utility bound: RobloxGui",
          "Workspace script running...",
        ];
        const logMsg = dummyLogs[Math.floor(Math.random() * dummyLogs.length)]!;
        this.addLog("info", `[SIMULATOR] ${logMsg}`);
      }
    }, 1000);
  }

  private activeTcpMode(): TcpExecutorMode {
    return this.activeExecutor;
  }

  private commandName(command: "detect_ports" | "connect" | "disconnect" | "execute" | "status", mode = this.activeTcpMode()) {
    return `${mode}_${command}`;
  }

  private statusEventName(mode = this.activeTcpMode()) {
    return `${mode}:status-changed`;
  }

  private executorLabel() {
    return this.activeTcpMode() === "opiumware" ? "Opiumware" : "MacSploit";
  }

  private async statusFor(mode: TcpExecutorMode) {
    return invoke<{ connected: boolean; port: number | null; last_error: string | null }>(this.commandName("status", mode));
  }

  private async detectActiveExecutor(): Promise<{ mode: TcpExecutorMode; port: number } | null> {
    const [macPorts, opiumPorts] = await Promise.all([
      invoke<number[]>(this.commandName("detect_ports", "macsploit")).catch(() => []),
      invoke<number[]>(this.commandName("detect_ports", "opiumware")).catch(() => []),
    ]);
    if (macPorts.length > 0) return { mode: "macsploit", port: macPorts[0]! };
    if (opiumPorts.length > 0) return { mode: "opiumware", port: opiumPorts[0]! };
    return null;
  }

  private async listenForStatus(mode: TcpExecutorMode): Promise<UnlistenFn> {
    return listen<{ connected: boolean; port: number | null; last_error: string | null }>(
      this.statusEventName(mode),
      (ev) => {
        const { connected, port } = ev.payload;
        if (!connected && this.activeExecutor !== mode) return;
        this.activeExecutor = mode;
        if (port) {
          this.lastKnownPort = port;
          this.lastKnownExecutor = mode;
        }
        if (this.isConnected !== connected || this.currentPort !== port) {
          this.isConnected = connected;
          this.currentPort = port;
          this.isConnecting = false;
          if (this.isConnected) {
            this.dispatchEvent(new Event("attached"));
            this.dispatchEvent(new Event("ready"));
          } else {
            this.dispatchEvent(new Event("detached"));
          }
        }
      }
    );
  }

  private addLog(level: "info" | "warn" | "error", message: string) {
    const entry: LogEntry = { ts: Date.now(), level, message };
    this.logs = [...this.logs, entry].slice(-500); // Caps logs at 500
    this.dispatchEvent(new Event("logs-updated"));
  }

  private logDebug(message: string) {
    if (this.verbose) {
      console.log(`[MacSploitManager] ${message}`);
    }
  }
}
