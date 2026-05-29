use std::path::PathBuf;
use tauri::utils::config::Color;
use tauri::{include_image, Manager, WebviewUrl, WebviewWindowBuilder};

const DEFAULT_WINDOW_ICON: tauri::image::Image<'_> = include_image!("icons/32x32.png");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            persist_window_icon_preset,
            persist_app_settings_snapshot,
            read_text_file_abs,
            write_text_file_abs,
            reveal_in_file_manager,
            reveal_sidebar_script,
            reveal_sidebar_script_path,
            open_scripts_folder,
            list_sidebar_scripts,
            list_autoexecute_scripts,
            move_script_file,
            get_scripts_directory,
            open_external_url,
            write_clipboard_text,
            bridge_status,
            bridge_send_execute,
            ai_models::fetch_ai_models,
            ai_chat::send_ai_chat,
            ai_chat::send_ai_chat_stream,
            // MacSploit Commands
            macsploit::macsploit_detect_ports,
            macsploit::macsploit_connect,
            macsploit::macsploit_disconnect,
            macsploit::macsploit_execute,
            macsploit::macsploit_status,
            // Opiumware Commands
            opiumware::opiumware_detect_ports,
            opiumware::opiumware_connect,
            opiumware::opiumware_disconnect,
            opiumware::opiumware_execute,
            opiumware::opiumware_status,
        ])
        .setup(|app| {
            // Add standard macOS application menu (App, Edit with Copy/Paste/Cut, etc.)
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::Menu;
                if let Ok(menu) = Menu::default(app.handle()) {
                    let _ = app.set_menu(menu);
                }
            }

            let bridge = crate::bridge::BridgeState::new(app.handle().clone());
            app.manage(bridge.clone());

            let macsploit = std::sync::Arc::new(crate::macsploit::MacSploitState::new());
            app.manage(macsploit);
            let opiumware = std::sync::Arc::new(crate::opiumware::OpiumwareState::new());
            app.manage(opiumware);

            // The Axum server hosts both transports on :31337 — `/ws` for the
            // WebSocket Bridge and `/port_bridge/*` for the HTTP-polling Port
            // Bridge. We additionally spawn `port_bridge::serve`, which now just
            // runs the liveness watchdog that flips `port_connected` to false
            // when the polling client stops checking in. Both run regardless of
            // the UI's selected method; the dropdown just decides which status
            // the UI trusts.
            {
                let ws_bridge = bridge.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = crate::bridge::serve(ws_bridge.clone()).await {
                        ws_bridge.set_error(e).await;
                    }
                });
            }
            {
                let port_bridge = bridge.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = crate::port_bridge::serve(port_bridge.clone()).await {
                        port_bridge.set_error(e).await;
                    }
                });
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            build_main_window(app)?;

            if let Err(e) = apply_window_icon_from_disk(app.handle().clone()) {
                log::warn!("window icon: {e}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod ai_chat;
mod ai_models;
mod bridge;
mod macsploit;
mod opiumware;
mod port_bridge;

const WINDOW_ICON_PRESET_FILE: &str = "window_icon_preset.json";
/// Mirrors `synapse.appSettings.v1` from the webview localStorage so cold starts can route the
/// main webview to `/synapse-original/loading` or `/synapse-x/loading` before the first frame paints.
const APP_SETTINGS_SNAPSHOT_FILE: &str = "app_settings_snapshot.json";

fn read_boot_ui_mode(app: &tauri::AppHandle) -> Option<String> {
    let dir = app.path().app_config_dir().ok()?;
    let path = dir.join(APP_SETTINGS_SNAPSHOT_FILE);
    let raw = std::fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
    v.get("uiMode")?
        .as_str()
        .map(std::string::ToString::to_string)
}

fn read_boot_always_on_top(app: &tauri::AppHandle) -> bool {
    let dir = match app.path().app_config_dir() {
        Ok(d) => d,
        Err(_) => return false,
    };
    let path = dir.join(APP_SETTINGS_SNAPSHOT_FILE);
    let raw = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let v: serde_json::Value = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(_) => return false,
    };
    v.get("alwaysOnTop")
        .and_then(|x| x.as_bool())
        .unwrap_or(false)
}

/// Initial window geometry per shell mode — matches the loader each shell opens at.
struct BootWindowConfig {
    route: &'static str,
    width: f64,
    height: f64,
    bg: Color,
    transparent: bool,
}

fn boot_window_config(app: &tauri::AppHandle) -> BootWindowConfig {
    match read_boot_ui_mode(app).as_deref() {
        Some("cosmic") | Some("synapseOriginal") => BootWindowConfig {
            route: "synapse-original/loading",
            width: 265.0,
            height: 171.0,
            bg: Color(0, 0, 0, 0), // Transparent
            transparent: true,
        },
        Some("synapseX") => BootWindowConfig {
            route: "synapse-x/loading",
            width: 418.0,
            height: 117.0,
            bg: Color(0, 0, 0, 0), // Transparent
            transparent: true,
        },
        Some("synapseV3") => BootWindowConfig {
            route: "synapse-v3/main",
            width: 961.0,
            height: 461.0,
            bg: Color(0, 0, 0, 0), // Transparent
            transparent: true,
        },
        _ => BootWindowConfig {
            route: "synapse-v3/main",
            width: 961.0,
            height: 461.0,
            bg: Color(0, 0, 0, 0), // Transparent
            transparent: true,
        },
    }
}

/// Build the `main` webview window programmatically so the very first asset request already
/// targets the correct shell route. Mirrors every property previously declared in
/// `tauri.conf.json`'s `app.windows[0]` entry.
fn build_main_window(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let cfg = boot_window_config(&app.handle());
    let always_on_top = read_boot_always_on_top(&app.handle());
    let mut builder =
        WebviewWindowBuilder::new(app, "main", WebviewUrl::App(PathBuf::from(cfg.route)))
            .title("Synapse Framework")
            .inner_size(cfg.width, cfg.height)
            .center()
            .decorations(false)
            .shadow(false)
            .resizable(false)
            .fullscreen(false)
            .transparent(cfg.transparent);

    if always_on_top {
        builder = builder.always_on_top(true);
    }

    if !cfg.transparent {
        builder = builder.background_color(cfg.bg);
    }

    builder.icon(DEFAULT_WINDOW_ICON)?.build()?;
    Ok(())
}

fn window_icon_bytes(preset: &str) -> &'static [u8] {
    match preset.trim() {
        "wordmark" => include_bytes!("../icons/synapse_wordmark.png"),
        "synapse-icon" => include_bytes!("../icons/synapse_icon.png"),
        "framework" => include_bytes!("../icons/framework.png"),
        "icon2" => include_bytes!("../icons/icon2.png"),
        _ => include_bytes!("../icons/icon2.png"),
    }
}

fn read_window_icon_preset_from_snapshot(app: &tauri::AppHandle) -> Option<String> {
    let dir = app.path().app_config_dir().ok()?;
    let raw = std::fs::read_to_string(dir.join(APP_SETTINGS_SNAPSHOT_FILE)).ok()?;
    let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
    v.get("windowIconPreset")?
        .as_str()
        .map(std::string::ToString::to_string)
}

fn read_window_icon_preset_from_disk(app: &tauri::AppHandle) -> String {
    let dir = match app.path().app_config_dir() {
        Ok(d) => d,
        Err(_) => return "icon2".to_string(),
    };
    let path = dir.join(WINDOW_ICON_PRESET_FILE);
    if let Ok(raw) = std::fs::read_to_string(&path) {
        if let Some(preset) = serde_json::from_str::<serde_json::Value>(&raw)
            .ok()
            .and_then(|v| {
                v.get("preset")?
                    .as_str()
                    .map(std::string::ToString::to_string)
            })
        {
            return preset;
        }
    }
    read_window_icon_preset_from_snapshot(app).unwrap_or_else(|| "icon2".to_string())
}

fn apply_window_icon_for_preset(app: tauri::AppHandle, preset: &str) -> Result<(), String> {
    use tauri::image::Image;
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    let icon = Image::from_bytes(window_icon_bytes(preset)).map_err(|e| e.to_string())?;
    window.set_icon(icon).map_err(|e| e.to_string())?;
    Ok(())
}

fn apply_window_icon_from_disk(app: tauri::AppHandle) -> Result<(), String> {
    let preset = read_window_icon_preset_from_disk(&app);
    apply_window_icon_for_preset(app, preset.trim())
}

#[tauri::command]
fn read_text_file_abs(path: String) -> Result<String, String> {
    std::fs::read_to_string(std::path::Path::new(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file_abs(path: String, contents: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(p, contents).map_err(|e| e.to_string())
}

/// Opens `url` in the system default browser (WebView `window.open` is unreliable on Windows).
#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let url = url.trim();
    if url.starts_with("file://") {
        let path = url.strip_prefix("file://").unwrap();
        open::that(path).map_err(|e| e.to_string())
    } else if url.starts_with("https://") || url.starts_with("http://") {
        open::that(url).map_err(|e| e.to_string())
    } else {
        Err("Only http(s) or file URLs are allowed.".into())
    }
}

#[tauri::command]
fn write_clipboard_text(text: String) -> Result<(), String> {
    let mut cb = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    cb.set_text(text).map_err(|e| e.to_string())
}

#[tauri::command]
async fn bridge_status(
    bridge: tauri::State<'_, bridge::BridgeState>,
) -> Result<bridge::BridgeStatus, String> {
    Ok(bridge.status().await)
}

/// Method-aware execute dispatcher. `method` is the wire-name of the active bridge
/// (`"websocket"` default, or `"port"` for the HTTP-polling Port Bridge).
#[tauri::command]
async fn bridge_send_execute(
    bridge: tauri::State<'_, bridge::BridgeState>,
    source: String,
    method: Option<String>,
) -> Result<String, String> {
    let m = method.unwrap_or_else(|| "websocket".to_string());
    bridge.send_execute(source, m.as_str()).await
}

#[cfg(target_os = "windows")]
fn canonicalize_path_for_explorer(p: &std::path::Path) -> std::path::PathBuf {
    dunce::canonicalize(p).unwrap_or_else(|_| p.to_path_buf())
}

/// Select a file in Explorer using the shell API (reliable with spaces and long paths).
#[cfg(target_os = "windows")]
fn reveal_file_in_explorer_windows(p: &std::path::Path) -> Result<(), String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::System::Com::{
        CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED,
    };
    use windows_sys::Win32::UI::Shell::{ILCreateFromPathW, ILFree, SHOpenFolderAndSelectItems};

    let canonical = canonicalize_path_for_explorer(p);
    if !canonical.is_file() {
        return Err(format!("Not a file: {}", canonical.display()));
    }

    let wide: Vec<u16> = OsStr::new(&canonical)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let co_hr = CoInitializeEx(std::ptr::null_mut(), COINIT_APARTMENTTHREADED as u32);
        let co_owned = co_hr == 0;
        if co_hr < 0 {
            return Err(format!("CoInitializeEx failed: 0x{:08X}", co_hr as u32));
        }

        let pidl = ILCreateFromPathW(wide.as_ptr());
        if pidl.is_null() {
            if co_owned {
                CoUninitialize();
            }
            return Err(format!(
                "Could not resolve path for Explorer: {}",
                canonical.display()
            ));
        }

        let hr = SHOpenFolderAndSelectItems(pidl, 0, std::ptr::null(), 0);
        ILFree(pidl);
        if co_owned {
            CoUninitialize();
        }

        if hr < 0 {
            return Err(format!(
                "SHOpenFolderAndSelectItems failed for {}: 0x{:08X}",
                canonical.display(),
                hr as u32
            ));
        }
    }

    Ok(())
}

fn open_path_in_explorer(p: &std::path::Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let canonical = canonicalize_path_for_explorer(p);
        if canonical.is_dir() {
            let s = canonical.to_string_lossy().replace('/', "\\");
            std::process::Command::new("cmd")
                .arg("/c")
                .arg("start")
                .arg("")
                .arg(s.as_str())
                .spawn()
                .map_err(|e| format!("Failed to start explorer for directory {}: {}", s, e))?;
            return Ok(());
        }
        return reveal_file_in_explorer_windows(&canonical);
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(p)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let parent = p
            .parent()
            .ok_or_else(|| "No parent directory".to_string())?;
        std::process::Command::new("xdg-open")
            .arg(parent.as_os_str())
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

pub(crate) fn find_scripts_dir(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    // 1. Try resources/scripts
    if let Ok(res_dir) = app.path().resource_dir() {
        let candidates = [
            res_dir.join("scripts"),
            res_dir.join("resources").join("scripts"),
        ];
        for p in candidates {
            if p.exists() {
                return Some(p);
            }
        }
    }

    // 2. Try scripts/ in exe dir or parents
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                exe_dir.join("scripts"),
                exe_dir.join("resources").join("scripts"),
            ];
            for p in candidates {
                if p.exists() {
                    return Some(p);
                }
            }

            if let Some(parent) = exe_dir.parent() {
                let p = parent.join("scripts");
                if p.exists() {
                    return Some(p);
                }
                if let Some(root) = parent.parent() {
                    let p = root.join("scripts");
                    if p.exists() {
                        return Some(p);
                    }
                }
            }
        }
    }

    // 3. Check app config dir
    if let Ok(config_dir) = app.path().app_config_dir() {
        let p = config_dir.join("scripts");
        if p.exists() {
            return Some(p);
        }
    }

    None
}
#[tauri::command]
fn reveal_in_file_manager(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let mut p = std::path::PathBuf::from(&path);

    if !p.is_absolute() {
        if let Some(base) = find_scripts_dir(&app) {
            let p_try = base.join(&path);
            if p_try.exists() {
                p = p_try;
            } else {
                let p_try_2 = base.join(path);
                if p_try_2.exists() {
                    p = p_try_2;
                }
            }
        }
    }

    if !p.exists() {
        return Err(format!(
            "Path does not exist: {:?}. Please ensure the scripts folder is correctly set up.",
            p
        ));
    }

    open_path_in_explorer(&p)
}

/// Reveal a sidebar script by file name in the same folder `list_sidebar_scripts` / `list_autoexecute_scripts` use.
#[tauri::command]
fn reveal_sidebar_script(
    app: tauri::AppHandle,
    file_name: String,
    in_autoexecute: Option<bool>,
) -> Result<(), String> {
    let name = file_name.trim();
    if name.is_empty() {
        return Err("No file name for this script.".to_string());
    }
    let path = if in_autoexecute.unwrap_or(false) {
        autoexecute_dir(&app)?.join(name)
    } else {
        let dir =
            find_scripts_dir(&app).ok_or_else(|| "Scripts directory not found.".to_string())?;
        dir.join(name)
    };
    if !path.exists() {
        return Err(format!("Script not found at {}.", path.to_string_lossy()));
    }
    open_path_in_explorer(&path)
}

fn path_is_under_sidebar_roots(app: &tauri::AppHandle, path: &std::path::Path) -> bool {
    let canonical = match dunce::canonicalize(path) {
        Ok(c) => c,
        Err(_) => return false,
    };

    if let Ok(auto_dir) = autoexecute_dir(app) {
        if let Ok(auto_canon) = dunce::canonicalize(&auto_dir) {
            if canonical.starts_with(&auto_canon) {
                return true;
            }
        }
    }

    if let Some(scripts_dir) = find_scripts_dir(app) {
        if let Ok(scripts_canon) = dunce::canonicalize(&scripts_dir) {
            if canonical.starts_with(&scripts_canon) {
                return true;
            }
        }
    }

    false
}

/// Reveal a script using the absolute path returned by `list_sidebar_scripts` / `list_autoexecute_scripts`.
#[tauri::command]
fn reveal_sidebar_script_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("No path provided.".to_string());
    }

    let p = std::path::PathBuf::from(trimmed);
    if !p.is_absolute() {
        return Err("Script path must be absolute.".to_string());
    }
    if !p.exists() {
        return Err(format!("Script not found at {}.", trimmed));
    }
    if !path_is_under_sidebar_roots(&app, &p) {
        return Err("Path is outside the scripts folder.".to_string());
    }

    open_path_in_explorer(&p)
}

#[derive(serde::Serialize)]
struct ScriptEntry {
    name: String,
    path: String,
}

#[tauri::command]
fn list_sidebar_scripts(app: tauri::AppHandle) -> Result<Vec<ScriptEntry>, String> {
    let dir = find_scripts_dir(&app).ok_or_else(|| "Scripts directory not found".to_string())?;
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("lua") {
            if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                out.push(ScriptEntry {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

fn autoexecute_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let scripts = find_scripts_dir(app).ok_or_else(|| "Scripts directory not found".to_string())?;
    let dir = scripts.join("autoexecute");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir)
}

fn list_lua_scripts_in_dir(dir: &std::path::Path) -> Result<Vec<ScriptEntry>, String> {
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("lua") {
            if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                out.push(ScriptEntry {
                    name: name.to_string(),
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(out)
}

#[tauri::command]
fn list_autoexecute_scripts(app: tauri::AppHandle) -> Result<Vec<ScriptEntry>, String> {
    let dir = autoexecute_dir(&app)?;
    list_lua_scripts_in_dir(&dir)
}

#[tauri::command]
fn move_script_file(from: String, to: String) -> Result<(), String> {
    let from_p = PathBuf::from(&from);
    let to_p = PathBuf::from(&to);
    if let Some(parent) = to_p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::rename(&from_p, &to_p).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_scripts_directory(app: tauri::AppHandle) -> Result<String, String> {
    find_scripts_dir(&app)
        .ok_or_else(|| "Scripts directory not found".to_string())
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn open_scripts_folder(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(path) = find_scripts_dir(&app) {
        return open_path_in_explorer(&path);
    }

    let config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let scripts_path = config_dir.join("scripts");
    if !scripts_path.exists() {
        std::fs::create_dir_all(&scripts_path).map_err(|e| e.to_string())?;
    }

    open_path_in_explorer(&scripts_path)
}

#[tauri::command]
fn persist_app_settings_snapshot(app: tauri::AppHandle, snapshot: String) -> Result<(), String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(APP_SETTINGS_SNAPSHOT_FILE);
    std::fs::write(path, snapshot).map_err(|e| e.to_string())
}

#[tauri::command]
fn persist_window_icon_preset(app: tauri::AppHandle, preset: String) -> Result<(), String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(WINDOW_ICON_PRESET_FILE);
    let body = serde_json::json!({ "preset": preset });
    std::fs::write(&path, body.to_string()).map_err(|e| e.to_string())?;
    apply_window_icon_for_preset(app, preset.trim())
}
