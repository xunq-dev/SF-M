use flate2::{write::ZlibEncoder, Compression};
use serde::{Deserialize, Serialize};
use std::{io::Write, sync::Arc};
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::sync::Mutex;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct OpiumwareStatus {
    pub connected: bool,
    pub port: Option<u16>,
    pub last_error: Option<String>,
}

pub struct OpiumwareState {
    pub status: Mutex<OpiumwareStatus>,
}

impl OpiumwareState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(OpiumwareStatus {
                connected: false,
                port: None,
                last_error: None,
            }),
        }
    }
}

fn build_execute_packet(script: &str) -> Result<Vec<u8>, String> {
    let formatted = format!("OpiumwareScript {}", script);
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder
        .write_all(formatted.as_bytes())
        .map_err(|e| format!("Failed to compress script: {}", e))?;
    encoder
        .finish()
        .map_err(|e| format!("Failed to finish script compression: {}", e))
}

async fn connect_stream(
    app: AppHandle,
    state: Arc<OpiumwareState>,
    port: u16,
) -> Result<(), String> {
    let addr = format!("127.0.0.1:{}", port);
    let mut stream =
        tokio::time::timeout(std::time::Duration::from_secs(3), TcpStream::connect(&addr))
            .await
            .map_err(|_| format!("Timed out connecting to {}", addr))?
            .map_err(|e| format!("Failed to connect to {}: {}", addr, e))?;

    let _ = stream.shutdown().await;

    let mut status_guard = state.status.lock().await;
    status_guard.connected = true;
    status_guard.port = Some(port);
    status_guard.last_error = None;
    let _ = app.emit("opiumware:status-changed", status_guard.clone());
    Ok(())
}

#[tauri::command]
pub async fn opiumware_detect_ports() -> Result<Vec<u16>, String> {
    let mut tasks = Vec::new();
    for port in 8392..=8397 {
        tasks.push(async move {
            let addr = format!("127.0.0.1:{}", port);
            match tokio::time::timeout(
                std::time::Duration::from_millis(500),
                TcpStream::connect(&addr),
            )
            .await
            {
                Ok(Ok(_)) => Some(port),
                _ => None,
            }
        });
    }
    let results = futures_util::future::join_all(tasks).await;
    Ok(results.into_iter().flatten().collect())
}

#[tauri::command]
pub async fn opiumware_connect(
    app: AppHandle,
    state: tauri::State<'_, Arc<OpiumwareState>>,
    port: u16,
) -> Result<(), String> {
    connect_stream(app, Arc::clone(&state.inner()), port).await
}

#[tauri::command]
pub async fn opiumware_disconnect(
    app: AppHandle,
    state: tauri::State<'_, Arc<OpiumwareState>>,
) -> Result<(), String> {
    let mut status_guard = state.status.lock().await;
    status_guard.connected = false;
    status_guard.port = None;
    status_guard.last_error = Some("Manually disconnected".to_string());
    let _ = app.emit("opiumware:status-changed", status_guard.clone());

    Ok(())
}

#[tauri::command]
pub async fn opiumware_execute(
    app: AppHandle,
    state: tauri::State<'_, Arc<OpiumwareState>>,
    script: String,
) -> Result<(), String> {
    let state = Arc::clone(&state.inner());

    async fn write_script_to_port(port: u16, script: &str) -> Result<(), String> {
        let addr = format!("127.0.0.1:{}", port);
        let mut stream =
            tokio::time::timeout(std::time::Duration::from_secs(3), TcpStream::connect(&addr))
                .await
                .map_err(|_| format!("Timed out connecting to {}", addr))?
                .map_err(|e| format!("Failed to connect to {}: {}", addr, e))?;
        let packet = build_execute_packet(script)?;
        stream
            .write_all(&packet)
            .await
            .map_err(|e| format!("Failed to write to TCP socket: {}", e))?;
        let _ = stream.shutdown().await;
        Ok(())
    }

    let port = state
        .status
        .lock()
        .await
        .port
        .ok_or_else(|| "Not attached to Opiumware".to_string())?;

    match write_script_to_port(port, &script).await {
        Ok(()) => {
            let mut status_guard = state.status.lock().await;
            status_guard.connected = true;
            status_guard.last_error = None;
            let _ = app.emit("opiumware:status-changed", status_guard.clone());
            Ok(())
        }
        Err(err) => {
            let mut status_guard = state.status.lock().await;
            status_guard.connected = false;
            status_guard.last_error = Some(err.clone());
            let _ = app.emit("opiumware:status-changed", status_guard.clone());
            Err(err)
        }
    }
}

#[tauri::command]
pub async fn opiumware_status(
    state: tauri::State<'_, Arc<OpiumwareState>>,
) -> Result<OpiumwareStatus, String> {
    let status_guard = state.status.lock().await;
    Ok(status_guard.clone())
}
