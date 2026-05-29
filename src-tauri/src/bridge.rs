use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::{collections::VecDeque, net::SocketAddr, sync::Arc, time::Instant};
use tauri::Emitter;
use tokio::sync::{mpsc, Mutex, Notify};
use uuid::Uuid;

pub const BRIDGE_PORT: u16 = 31337;

#[derive(Clone)]
pub struct BridgeState {
    inner: Arc<Mutex<BridgeInner>>,
    app: tauri::AppHandle,
    /// Wake source for the Port Bridge HTTP long-poll. Every push to
    /// `port_pending_execs` calls `notify_waiters` so any blocked
    /// `/port_bridge/next` returns immediately with the new exec.
    port_notify: Arc<Notify>,
}

pub(crate) struct BridgeInner {
    pub(crate) active_tx: Option<mpsc::UnboundedSender<Message>>,
    pub(crate) connected: bool,
    pub(crate) client: Option<ClientHello>,
    pub(crate) last_error: Option<String>,
    pub(crate) matcha_connected: bool,
    pub(crate) matcha_pending: Option<PendingExec>,
    /// HTTP-polling "Port Bridge" — served from the same Axum app under
    /// `/port_bridge/*`. No dedicated TCP port: the Lua client pulls work
    /// over `game:HttpGet` so even very limited executors can connect.
    pub(crate) port_listening: bool,
    pub(crate) port_connected: bool,
    pub(crate) port_client: Option<ClientHello>,
    /// FIFO of pending execute requests awaiting the next long-poll. We use a
    /// queue (not a single Option) so bursts of clicks aren't lost.
    pub(crate) port_pending_execs: VecDeque<PendingExec>,
    /// Last time any `/port_bridge/*` request touched the namespace. The
    /// watchdog flips `port_connected` to false after a configurable idle
    /// timeout.
    pub(crate) port_last_seen: Option<Instant>,
}

#[derive(Debug, Clone)]
pub(crate) struct PendingExec {
    pub(crate) id: String,
    pub(crate) source_b64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientHello {
    pub client: String,
    pub version: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct BridgeStatus {
    pub listening: bool,
    pub connected: bool,
    pub client: Option<ClientHello>,
    pub last_error: Option<String>,
    pub matcha_connected: bool,
    /// Raw-TCP Port Bridge: is the listener bound?
    pub port_listening: bool,
    /// Raw-TCP Port Bridge: is a client currently attached?
    pub port_connected: bool,
    /// Raw-TCP Port Bridge: hello payload from the attached client (if any).
    pub port_client: Option<ClientHello>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum IncomingWs {
    #[serde(rename = "hello")]
    Hello { client: String, version: i32 },
    #[serde(rename = "execute_result")]
    ExecuteResult {
        id: String,
        ok: bool,
        #[serde(default)]
        error: Option<String>,
    },
    #[serde(rename = "log")]
    Log { level: String, message: String },
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub(crate) enum OutgoingWs<'a> {
    #[serde(rename = "execute")]
    Execute {
        id: &'a str,
        source_b64: &'a str,
        encoding: &'a str,
        origin: &'a str,
    },
    #[serde(rename = "ping")]
    Ping,
}

pub(crate) const BRIDGE_STATUS_EVENT: &str = "synapse:bridge-status";
pub(crate) const BRIDGE_EXECUTE_RESULT_EVENT: &str = "synapse:bridge-execute-result";
pub(crate) const BRIDGE_LOG_EVENT: &str = "synapse:bridge-log";

impl BridgeState {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self {
            inner: Arc::new(Mutex::new(BridgeInner {
                active_tx: None,
                connected: false,
                client: None,
                last_error: None,
                matcha_connected: false,
                matcha_pending: None,
                port_listening: false,
                port_connected: false,
                port_client: None,
                port_pending_execs: VecDeque::new(),
                port_last_seen: None,
            })),
            app,
            port_notify: Arc::new(Notify::new()),
        }
    }

    pub(crate) fn inner(&self) -> &Mutex<BridgeInner> {
        &self.inner
    }

    pub(crate) fn app(&self) -> &tauri::AppHandle {
        &self.app
    }

    /// Notifier consumed by the Port Bridge HTTP long-poll handler.
    pub(crate) fn port_notify(&self) -> &Notify {
        &self.port_notify
    }

    pub(crate) async fn emit_status(&self) {
        let st = self.status().await;
        let _ = self.app.emit(BRIDGE_STATUS_EVENT, st);
    }

    pub async fn status(&self) -> BridgeStatus {
        let inner = self.inner.lock().await;
        BridgeStatus {
            listening: true,
            connected: inner.connected,
            client: inner.client.clone(),
            last_error: inner.last_error.clone(),
            matcha_connected: inner.matcha_connected,
            port_listening: inner.port_listening,
            port_connected: inner.port_connected,
            port_client: inner.port_client.clone(),
        }
    }

    pub async fn set_error(&self, msg: String) {
        {
            let mut inner = self.inner.lock().await;
            inner.last_error = Some(msg);
        }
        self.emit_status().await;
    }

    /// Method-aware execute dispatcher. `method` is `"websocket"` (default) or `"port"`.
    /// Each method requires its corresponding bridge to be attached; we never silently
    /// fall back across methods so the UI can show an honest "not connected" error.
    pub async fn send_execute(&self, source: String, method: &str) -> Result<String, String> {
        let id = format!("exec_{}", Uuid::new_v4());
        let source_b64 = base64::engine::general_purpose::STANDARD.encode(source.as_bytes());

        match method {
            "port" => {
                {
                    let mut inner = self.inner.lock().await;
                    if !inner.port_connected {
                        return Err(
              "Port Bridge is not connected. Click Attach and run Port Bridge.lua in your executor."
                .to_string(),
            );
                    }
                    inner.port_pending_execs.push_back(PendingExec {
                        id: id.clone(),
                        source_b64: source_b64.clone(),
                    });
                }
                /* Wake up any in-flight `/port_bridge/next` long-polls so they return
                 * the new exec immediately, instead of waiting for their timeout. */
                self.port_notify.notify_waiters();
                Ok(id)
            }
            _ => {
                let (tx, ws_connected, matcha_connected) = {
                    let inner = self.inner.lock().await;
                    (
                        inner.active_tx.clone(),
                        inner.connected,
                        inner.matcha_connected,
                    )
                };
                if (!ws_connected || tx.is_none()) && !matcha_connected {
                    return Err(
            "Websocket Bridge is not connected. Click Attach and run Websocket Bridge.lua in your executor."
              .to_string(),
          );
                }

                if matcha_connected {
                    let mut inner = self.inner.lock().await;
                    inner.matcha_pending = Some(PendingExec {
                        id: id.clone(),
                        source_b64: source_b64.clone(),
                    });
                }

                let payload = OutgoingWs::Execute {
                    id: &id,
                    source_b64: &source_b64,
                    encoding: "base64",
                    origin: "editor",
                };
                let text = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
                if ws_connected && tx.is_some() {
                    tx.unwrap()
                        .send(Message::Text(text))
                        .map_err(|_| "Websocket Bridge connection closed.".to_string())?;
                }
                Ok(id)
            }
        }
    }
}

pub fn router(state: BridgeState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/ws", get(ws_upgrade))
        /* Back-compat alias — old executors still fetch `/bridge.lua`. */
        .route("/bridge.lua", get(websocket_bridge_lua_get))
        .route("/websocket_bridge.lua", get(websocket_bridge_lua_get))
        .route("/port_bridge.lua", get(port_bridge_lua_get))
        .route("/matcha/hello", post(matcha_hello))
        .route("/matcha/next", get(matcha_next))
        .route("/matcha/result", post(matcha_result))
        .route("/matcha/log", post(matcha_log))
        .route("/matcha/hello-get", get(matcha_hello_get))
        .route("/matcha/result-get", get(matcha_result_get))
        .route("/matcha/log-get", get(matcha_log_get))
        .merge(crate::port_bridge::routes())
        .with_state(state)
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

async fn ws_upgrade(ws: WebSocketUpgrade, State(state): State<BridgeState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| ws_handler(state, socket))
}

/// Serves the Websocket Bridge Luau client. The bundled file lives at
/// `resources/scripts/Websocket Bridge.lua`; we still serve it from the old
/// `bridge.lua` URL so prebuilt executor configs don't break.
async fn websocket_bridge_lua_get(State(state): State<BridgeState>) -> impl IntoResponse {
    serve_script_lua(&state, "Websocket Bridge.lua").await
}

/// Serves the Port Bridge Luau client (HTTP polling against `/port_bridge/*`).
async fn port_bridge_lua_get(State(state): State<BridgeState>) -> impl IntoResponse {
    serve_script_lua(&state, "Port Bridge.lua").await
}

async fn serve_script_lua(state: &BridgeState, file_name: &str) -> axum::response::Response {
    if let Some(scripts_dir) = crate::find_scripts_dir(&state.app) {
        let bridge_path = scripts_dir.join(file_name);
        if let Ok(content) = std::fs::read_to_string(&bridge_path) {
            return (StatusCode::OK, content).into_response();
        }
    }
    (
        StatusCode::NOT_FOUND,
        format!("{} not found in scripts directory.", file_name),
    )
        .into_response()
}

async fn ws_handler(state: BridgeState, socket: WebSocket) {
    let (mut ws_tx, mut ws_rx) = socket.split();
    let (out_tx, mut out_rx) = mpsc::unbounded_channel::<Message>();

    {
        let mut inner = state.inner.lock().await;
        inner.active_tx = Some(out_tx);
        inner.connected = true;
        inner.client = None;
    }
    state.emit_status().await;

    // Writer task.
    let write_task = tokio::spawn(async move {
        while let Some(msg) = out_rx.recv().await {
            if ws_tx.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Reader loop.
    while let Some(Ok(msg)) = ws_rx.next().await {
        match msg {
            Message::Text(text) => {
                if let Ok(parsed) = serde_json::from_str::<IncomingWs>(&text) {
                    match parsed {
                        IncomingWs::Hello { client, version } => {
                            {
                                let mut inner = state.inner.lock().await;
                                inner.client = Some(ClientHello { client, version });
                            }
                            state.emit_status().await;
                        }
                        IncomingWs::ExecuteResult { id, ok, error } => {
                            let _ = state.app.emit(
                                BRIDGE_EXECUTE_RESULT_EVENT,
                                serde_json::json!({ "id": id, "ok": ok, "error": error }),
                            );
                        }
                        IncomingWs::Log { level, message } => {
                            let _ = state.app.emit(
                                "synapse:bridge-log",
                                serde_json::json!({ "level": level, "message": message }),
                            );
                        }
                        IncomingWs::Unknown => {}
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    // Cleanup.
    {
        let mut inner = state.inner.lock().await;
        inner.connected = false;
        inner.active_tx = None;
        inner.client = None;
    }
    state.emit_status().await;
    write_task.abort();
}

#[derive(Debug, Deserialize)]
struct MatchaHelloBody {
    client: Option<String>,
    #[serde(default)]
    version: Option<i32>,
}

async fn matcha_hello(
    State(state): State<BridgeState>,
    Json(body): Json<MatchaHelloBody>,
) -> impl IntoResponse {
    {
        let mut inner = state.inner.lock().await;
        inner.matcha_connected = true;
        inner.client = Some(ClientHello {
            client: body.client.unwrap_or_else(|| "matcha".to_string()),
            version: body.version.unwrap_or(1),
        });
    }
    state.emit_status().await;
    (StatusCode::OK, "ok")
}

#[derive(Debug, Deserialize)]
struct MatchaHelloQuery {
    #[serde(default)]
    client: Option<String>,
    #[serde(default)]
    version: Option<i32>,
}

async fn matcha_hello_get(
    State(state): State<BridgeState>,
    Query(q): Query<MatchaHelloQuery>,
) -> impl IntoResponse {
    let body = MatchaHelloBody {
        client: q.client,
        version: q.version,
    };
    matcha_hello(State(state), Json(body)).await
}

#[derive(Debug, Serialize)]
struct MatchaNextResponse {
    exec: Option<MatchaExecPayload>,
}

#[derive(Debug, Serialize)]
struct MatchaExecPayload {
    id: String,
    source_b64: String,
    encoding: String,
    origin: String,
}

async fn matcha_next(State(state): State<BridgeState>) -> impl IntoResponse {
    let pending = {
        let mut inner = state.inner.lock().await;
        inner.matcha_connected = true;
        inner.matcha_pending.take()
    };

    let resp = MatchaNextResponse {
        exec: pending.map(|p| MatchaExecPayload {
            id: p.id,
            source_b64: p.source_b64,
            encoding: "base64".to_string(),
            origin: "editor".to_string(),
        }),
    };
    (StatusCode::OK, Json(resp))
}

#[derive(Debug, Deserialize)]
struct MatchaResultBody {
    id: String,
    ok: bool,
    #[serde(default)]
    error: Option<String>,
}

async fn matcha_result(
    State(state): State<BridgeState>,
    Json(body): Json<MatchaResultBody>,
) -> impl IntoResponse {
    state.inner.lock().await.matcha_connected = true;
    let _ = state.app.emit(
        BRIDGE_EXECUTE_RESULT_EVENT,
        serde_json::json!({ "id": body.id, "ok": body.ok, "error": body.error }),
    );
    (StatusCode::OK, "ok")
}

#[derive(Debug, Deserialize)]
struct MatchaResultQuery {
    id: String,
    ok: bool,
    #[serde(default)]
    error_b64: Option<String>,
}

async fn matcha_result_get(
    State(state): State<BridgeState>,
    Query(q): Query<MatchaResultQuery>,
) -> impl IntoResponse {
    let error = q
        .error_b64
        .and_then(|b64| base64::engine::general_purpose::STANDARD.decode(b64).ok())
        .and_then(|bytes| String::from_utf8(bytes).ok());
    let body = MatchaResultBody {
        id: q.id,
        ok: q.ok,
        error,
    };
    matcha_result(State(state), Json(body)).await
}

#[derive(Debug, Deserialize)]
struct MatchaLogBody {
    level: String,
    message: String,
}

async fn matcha_log(
    State(state): State<BridgeState>,
    Json(body): Json<MatchaLogBody>,
) -> impl IntoResponse {
    state.inner.lock().await.matcha_connected = true;
    let _ = state.app.emit(
        "synapse:bridge-log",
        serde_json::json!({ "level": body.level, "message": body.message }),
    );
    (StatusCode::OK, "ok")
}

#[derive(Debug, Deserialize)]
struct MatchaLogQuery {
    level: String,
    message_b64: String,
}

async fn matcha_log_get(
    State(state): State<BridgeState>,
    Query(q): Query<MatchaLogQuery>,
) -> impl IntoResponse {
    let msg = base64::engine::general_purpose::STANDARD
        .decode(q.message_b64)
        .ok()
        .and_then(|bytes| String::from_utf8(bytes).ok())
        .unwrap_or_else(|| "<invalid base64 message>".to_string());
    let body = MatchaLogBody {
        level: q.level,
        message: msg,
    };
    matcha_log(State(state), Json(body)).await
}

pub async fn serve(state: BridgeState) -> Result<(), String> {
    let addr = SocketAddr::from(([127, 0, 0, 1], BRIDGE_PORT));
    let app = router(state);
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Bridge server bind failed on {addr}: {e}"))?;
    axum::serve(listener, app)
        .await
        .map_err(|e| format!("Bridge server failed: {e}"))?;
    Ok(())
}
