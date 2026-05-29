//! HTTP-polling "Port Bridge" — universal executor transport.
//!
//! Re-implemented from a raw-TCP listener into HTTP polling on the existing
//! Axum server (`:31337`) under the `/port_bridge/*` namespace. This lets
//! weak executors that only expose `game:HttpGet` (no WebSocket, no raw
//! sockets, no `request`) connect to the same UI.
//!
//! Endpoints (mounted by [`routes`]):
//!   * `GET/POST /port_bridge/hello`   — client identification, sets `connected=true`
//!   * `GET      /port_bridge/next`    — long-poll (≤ `LONG_POLL_TIMEOUT_SECS`) for the next execute request
//!   * `GET/POST /port_bridge/result`  — return `execute_result` (GET form takes `error_b64` so HttpGet-only executors can report errors)
//!   * `GET/POST /port_bridge/log`     — stream a log line
//!
//! Liveness: a watchdog ticks every [`WATCHDOG_INTERVAL_SECS`] and clears
//! `port_connected`/`port_client` if no client request has touched the
//! namespace within [`LIVENESS_TIMEOUT_SECS`]. The long-poll on `next`
//! doubles as a continuous heartbeat in steady state.

use std::time::{Duration, Instant};

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::Emitter;
use tokio::time::timeout;

use crate::bridge::{BridgeState, ClientHello, BRIDGE_EXECUTE_RESULT_EVENT, BRIDGE_LOG_EVENT};

/// How long a single `/port_bridge/next` waits before returning `{exec: null}`.
const LONG_POLL_TIMEOUT_SECS: u64 = 12;
/// Idle time after which the watchdog flips `port_connected` to false.
const LIVENESS_TIMEOUT_SECS: u64 = 20;
/// Cadence of the liveness watchdog.
const WATCHDOG_INTERVAL_SECS: u64 = 3;

/// Routes mounted onto the main Axum app in `bridge::router`.
pub fn routes() -> Router<BridgeState> {
    Router::new()
        .route(
            "/port_bridge/hello",
            post(port_hello_post).get(port_hello_get),
        )
        .route("/port_bridge/next", get(port_next))
        .route(
            "/port_bridge/result",
            post(port_result_post).get(port_result_get),
        )
        .route("/port_bridge/log", post(port_log_post).get(port_log_get))
}

/// Entry point spawned from `lib.rs`. Marks the bridge as listening and runs
/// the liveness watchdog forever. The HTTP routes themselves live on the WS
/// bridge's Axum server (port 31337) so there's no second port to bind.
pub async fn serve(state: BridgeState) -> Result<(), String> {
    {
        let mut inner = state.inner().lock().await;
        inner.port_listening = true;
    }
    state.emit_status().await;
    run_watchdog(state).await;
    Ok(())
}

/// Periodic task that flips `port_connected` to false after the client stops
/// polling. Also drains any pending exec queue so a fresh attach starts clean.
async fn run_watchdog(state: BridgeState) {
    let mut ticker = tokio::time::interval(Duration::from_secs(WATCHDOG_INTERVAL_SECS));
    loop {
        ticker.tick().await;
        let mut changed = false;
        {
            let mut inner = state.inner().lock().await;
            if inner.port_connected {
                let stale = inner
                    .port_last_seen
                    .map(|t| t.elapsed() > Duration::from_secs(LIVENESS_TIMEOUT_SECS))
                    .unwrap_or(true);
                if stale {
                    inner.port_connected = false;
                    inner.port_client = None;
                    inner.port_pending_execs.clear();
                    changed = true;
                }
            }
        }
        if changed {
            state.emit_status().await;
        }
    }
}

#[derive(Debug, Deserialize)]
struct HelloBody {
    #[serde(default)]
    client: Option<String>,
    #[serde(default)]
    version: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct HelloQuery {
    #[serde(default)]
    client: Option<String>,
    #[serde(default)]
    version: Option<i32>,
}

async fn port_hello_post(
    State(state): State<BridgeState>,
    Json(body): Json<HelloBody>,
) -> impl IntoResponse {
    set_hello(&state, body.client, body.version).await;
    (StatusCode::OK, "ok")
}

async fn port_hello_get(
    State(state): State<BridgeState>,
    Query(q): Query<HelloQuery>,
) -> impl IntoResponse {
    set_hello(&state, q.client, q.version).await;
    (StatusCode::OK, "ok")
}

async fn set_hello(state: &BridgeState, client: Option<String>, version: Option<i32>) {
    {
        let mut inner = state.inner().lock().await;
        inner.port_connected = true;
        inner.port_last_seen = Some(Instant::now());
        inner.port_client = Some(ClientHello {
            client: client.unwrap_or_else(|| "port-bridge".to_string()),
            version: version.unwrap_or(1),
        });
    }
    state.emit_status().await;
}

/// Refresh `port_last_seen` on every namespace touch. Emits a status update
/// when the connection transitions from disconnected to connected so the UI
/// pill flips green without waiting for an explicit hello.
async fn touch(state: &BridgeState) {
    let was_connected;
    {
        let mut inner = state.inner().lock().await;
        was_connected = inner.port_connected;
        inner.port_last_seen = Some(Instant::now());
        if !inner.port_connected {
            inner.port_connected = true;
        }
    }
    if !was_connected {
        state.emit_status().await;
    }
}

#[derive(Debug, Serialize)]
struct NextResponse {
    exec: Option<ExecPayload>,
}

#[derive(Debug, Serialize)]
struct ExecPayload {
    id: String,
    source_b64: String,
    encoding: String,
    origin: String,
}

/// Long-poll for the next execute. Returns immediately if one is queued;
/// otherwise blocks until [`BridgeState::port_notify`] is woken or the
/// timeout fires. We `notified()`-then-check (not check-then-`notified()`)
/// so we don't miss enqueues that race with the await.
async fn port_next(State(state): State<BridgeState>) -> impl IntoResponse {
    touch(&state).await;

    /* Register interest BEFORE the first check so any notify_waiters fired
     * between the check and the await is still observed. */
    let notify = state.port_notify();
    let notified = notify.notified();
    tokio::pin!(notified);

    if let Some(exec) = take_pending(&state).await {
        return (StatusCode::OK, Json(NextResponse { exec: Some(exec) })).into_response();
    }

    let _ = timeout(Duration::from_secs(LONG_POLL_TIMEOUT_SECS), &mut notified).await;

    let exec = take_pending(&state).await;
    (StatusCode::OK, Json(NextResponse { exec })).into_response()
}

async fn take_pending(state: &BridgeState) -> Option<ExecPayload> {
    let mut inner = state.inner().lock().await;
    inner.port_pending_execs.pop_front().map(|p| ExecPayload {
        id: p.id,
        source_b64: p.source_b64,
        encoding: "base64".to_string(),
        origin: "editor".to_string(),
    })
}

#[derive(Debug, Deserialize)]
struct ResultBody {
    id: String,
    ok: bool,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ResultQuery {
    id: String,
    ok: bool,
    #[serde(default)]
    error_b64: Option<String>,
}

async fn port_result_post(
    State(state): State<BridgeState>,
    Json(body): Json<ResultBody>,
) -> impl IntoResponse {
    touch(&state).await;
    let _ = state.app().emit(
        BRIDGE_EXECUTE_RESULT_EVENT,
        json!({"id": body.id, "ok": body.ok, "error": body.error}),
    );
    (StatusCode::OK, "ok")
}

async fn port_result_get(
    State(state): State<BridgeState>,
    Query(q): Query<ResultQuery>,
) -> impl IntoResponse {
    touch(&state).await;
    let error = q
        .error_b64
        .and_then(|b64| base64::engine::general_purpose::STANDARD.decode(b64).ok())
        .and_then(|bytes| String::from_utf8(bytes).ok());
    let _ = state.app().emit(
        BRIDGE_EXECUTE_RESULT_EVENT,
        json!({"id": q.id, "ok": q.ok, "error": error}),
    );
    (StatusCode::OK, "ok")
}

#[derive(Debug, Deserialize)]
struct LogBody {
    level: String,
    message: String,
}

#[derive(Debug, Deserialize)]
struct LogQuery {
    level: String,
    message_b64: String,
}

async fn port_log_post(
    State(state): State<BridgeState>,
    Json(body): Json<LogBody>,
) -> impl IntoResponse {
    touch(&state).await;
    let _ = state.app().emit(
        BRIDGE_LOG_EVENT,
        json!({"level": body.level, "message": body.message}),
    );
    (StatusCode::OK, "ok")
}

async fn port_log_get(
    State(state): State<BridgeState>,
    Query(q): Query<LogQuery>,
) -> impl IntoResponse {
    touch(&state).await;
    let msg = base64::engine::general_purpose::STANDARD
        .decode(q.message_b64)
        .ok()
        .and_then(|bytes| String::from_utf8(bytes).ok())
        .unwrap_or_else(|| "<invalid base64>".to_string());
    let _ = state
        .app()
        .emit(BRIDGE_LOG_EVENT, json!({"level": q.level, "message": msg}));
    (StatusCode::OK, "ok")
}
