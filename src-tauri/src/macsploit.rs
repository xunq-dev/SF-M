use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio::sync::Mutex;

// Types representing client message types
pub enum IpcTypes {
    IpcExecute = 0,
    IpcSetting = 1,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct MacSploitStatus {
    pub connected: bool,
    pub port: Option<u16>,
    pub last_error: Option<String>,
}

pub struct MacSploitState {
    pub status: Mutex<MacSploitStatus>,
}

impl MacSploitState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(MacSploitStatus {
                connected: false,
                port: None,
                last_error: None,
            }),
        }
    }
}

fn build_execute_packet(script: &str) -> Vec<u8> {
    let bytes = script.as_bytes();
    let mut header = [0u8; 16];
    header[0] = IpcTypes::IpcExecute as u8;
    let len = (bytes.len() + 1) as u64;
    header[8..16].copy_from_slice(&len.to_le_bytes());

    let mut packet = Vec::with_capacity(16 + bytes.len() + 1);
    packet.extend_from_slice(&header);
    packet.extend_from_slice(bytes);
    packet.push(0);
    packet
}

async fn connect_stream(
    app: AppHandle,
    state: Arc<MacSploitState>,
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
    let _ = app.emit("macsploit:status-changed", status_guard.clone());
    Ok(())
}

/// Detects open MacSploit ports concurrently (from port 5553 to 5563)
/// with a 50ms timeout. Returns a list of active ports.
#[tauri::command]
pub async fn macsploit_detect_ports() -> Result<Vec<u16>, String> {
    let mut tasks = Vec::new();
    for port in 5553..=5563 {
        tasks.push(async move {
            let addr = format!("127.0.0.1:{}", port);
            match tokio::time::timeout(
                std::time::Duration::from_millis(50),
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

/// Verifies the chosen MacSploit port is reachable and records it for execution.
#[tauri::command]
pub async fn macsploit_connect(
    app: AppHandle,
    state: tauri::State<'_, Arc<MacSploitState>>,
    port: u16,
) -> Result<(), String> {
    connect_stream(app, Arc::clone(&state.inner()), port).await
}

/// Detaches from the active MacSploit port.
#[tauri::command]
pub async fn macsploit_disconnect(
    app: AppHandle,
    state: tauri::State<'_, Arc<MacSploitState>>,
) -> Result<(), String> {
    let mut status_guard = state.status.lock().await;
    status_guard.connected = false;
    status_guard.port = None;
    status_guard.last_error = Some("Manually disconnected".to_string());
    let _ = app.emit("macsploit:status-changed", status_guard.clone());

    Ok(())
}

/// Sends a script to the active MacSploit TCP stream.
/// Opens a fresh TCP socket per run, matching MacSploit's one-shot IPC behavior.
#[tauri::command]
pub async fn macsploit_execute(
    app: AppHandle,
    state: tauri::State<'_, Arc<MacSploitState>>,
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
        let packet = build_execute_packet(script);
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
        .ok_or_else(|| "Not attached to MacSploit".to_string())?;

    match write_script_to_port(port, &script).await {
        Ok(()) => {
            let mut status_guard = state.status.lock().await;
            status_guard.connected = true;
            status_guard.last_error = None;
            let _ = app.emit("macsploit:status-changed", status_guard.clone());
            Ok(())
        }
        Err(err) => {
            let mut status_guard = state.status.lock().await;
            status_guard.connected = false;
            status_guard.last_error = Some(err.clone());
            let _ = app.emit("macsploit:status-changed", status_guard.clone());
            Err(err)
        }
    }
}

/// Retrieves the current connection status of MacSploit.
#[tauri::command]
pub async fn macsploit_status(
    state: tauri::State<'_, Arc<MacSploitState>>,
) -> Result<MacSploitStatus, String> {
    let status_guard = state.status.lock().await;
    Ok(status_guard.clone())
}
