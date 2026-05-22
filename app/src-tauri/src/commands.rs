use crate::bundled_fnn;
use crate::config_sync;
use crate::fiber_rpc;
use crate::fnn_fetch;
use crate::fnn_precheck;
use crate::fnn_runtime::{FnnRuntime, FnnRuntimeSnapshot};
use crate::secret;
use crate::settings::{self, AppSettings};
use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};

fn fnn_pid_file(data_dir: &str) -> PathBuf {
    Path::new(data_dir).join("fiber-desktop.pid")
}

fn remove_pid_files(paths: impl IntoIterator<Item = PathBuf>) {
    let mut seen = Vec::new();
    for path in paths {
        if seen.iter().any(|p: &PathBuf| p == &path) {
            continue;
        }
        let _ = std::fs::remove_file(&path);
        seen.push(path);
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PinnedFnnInfo {
    pub tag: String,
    pub asset_file_name: String,
    pub download_url: String,
}

#[tauri::command]
pub fn pinned_fnn_info() -> Result<PinnedFnnInfo, String> {
    let m = fnn_fetch::pinned_fnn_metadata()?;
    Ok(PinnedFnnInfo {
        tag: m.tag.to_string(),
        asset_file_name: m.asset_file_name,
        download_url: m.download_url,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FnnBinaryStatus {
    pub pinned_tag: String,
    pub bundled_path: Option<String>,
    pub is_bundled: bool,
    pub bundled_available: bool,
    pub active_path: String,
    /// True when `active_path` points to an existing file (spawnable `fnn`).
    pub executable_ready: bool,
    /// `bundled` | `downloaded` | `custom` | `unavailable`
    pub active_source: String,
}

fn fnn_binary_status_from_settings(
    app: &tauri::AppHandle,
    settings: &settings::AppSettings,
) -> FnnBinaryStatus {
    let bundled = bundled_fnn::bundled_executable_path(app);
    let bundled_available = bundled.is_some();
    let bundled_path = bundled.as_ref().map(|p| p.to_string_lossy().into_owned());
    let active = Path::new(&settings.fnn_binary_path);
    let source = bundled_fnn::classify_binary_source(app, active);
    let is_bundled = source == bundled_fnn::FnnBinarySource::Bundled;
    let executable_ready = active.is_file();
    FnnBinaryStatus {
        pinned_tag: fnn_fetch::PINNED_FNN_TAG.to_string(),
        bundled_path,
        is_bundled,
        bundled_available,
        active_path: settings.fnn_binary_path.clone(),
        executable_ready,
        active_source: source.as_str().to_string(),
    }
}

#[tauri::command]
pub fn fnn_binary_status(app: tauri::AppHandle) -> Result<FnnBinaryStatus, String> {
    let settings = settings::load_or_default(&app)?;
    Ok(fnn_binary_status_from_settings(&app, &settings))
}

/// Resolves a spawnable fnn path (bundled → downloaded → PATH), persists when the saved path was empty or missing.
#[tauri::command]
pub fn ensure_fnn_binary(app: tauri::AppHandle) -> Result<FnnBinaryStatus, String> {
    let mut settings = settings::load_or_default(&app)?;
    if bundled_fnn::apply_resolved_binary_path(&app, &mut settings.fnn_binary_path) {
        settings::save(&app, &settings)?;
    }
    Ok(fnn_binary_status_from_settings(&app, &settings))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CkbKeyStatus {
    pub ready: bool,
    pub key_path: String,
}

/// Ensures `{data_dir}/ckb` exists and returns its absolute path (for revealing in the system file manager).
#[tauri::command]
pub fn prepare_ckb_key_folder(app: tauri::AppHandle) -> Result<String, String> {
    let s = settings::load_or_default(&app)?;
    let key_path = fnn_precheck::ckb_node_key_path(&s.fnn_data_dir);
    let ckb_dir = key_path
        .parent()
        .ok_or_else(|| "invalid CKB key path".to_string())?;
    std::fs::create_dir_all(ckb_dir).map_err(|e| e.to_string())?;
    Ok(ckb_dir.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn ckb_key_status(app: tauri::AppHandle) -> Result<CkbKeyStatus, String> {
    let s = settings::load_or_default(&app)?;
    let key_path = fnn_precheck::ckb_node_key_path(&s.fnn_data_dir);
    let key_path_str = key_path.to_string_lossy().into_owned();
    let ready = key_path.is_file()
        && std::fs::metadata(&key_path)
            .map(|m| m.len() > 0)
            .unwrap_or(false);
    Ok(CkbKeyStatus {
        ready,
        key_path: key_path_str,
    })
}

/// Writes the CKB secp256k1 private key (64 hex chars, optional `0x` prefix) to `{data_dir}/ckb/key`.
#[tauri::command]
pub fn write_ckb_private_key(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let trimmed = key.trim();
    let hex_body = trimmed
        .strip_prefix("0x")
        .or_else(|| trimmed.strip_prefix("0X"))
        .unwrap_or(trimmed);
    if hex_body.len() != 64 || !hex_body.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(
            "Private key must be exactly 64 hex characters (optional 0x prefix).".to_string(),
        );
    }
    let s = settings::load_or_default(&app)?;
    let key_path = fnn_precheck::ckb_node_key_path(&s.fnn_data_dir);
    let ckb_dir = key_path
        .parent()
        .ok_or_else(|| "invalid CKB key path".to_string())?;
    std::fs::create_dir_all(ckb_dir).map_err(|e| e.to_string())?;
    std::fs::write(&key_path, hex_body).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn use_bundled_fnn_binary(app: tauri::AppHandle) -> Result<String, String> {
    let p = bundled_fnn::bundled_executable_path(&app).ok_or_else(|| {
        "Bundled fnn not found. For development run: bun run prepare:fnn".to_string()
    })?;
    let path_str = p.to_string_lossy().into_owned();
    let mut s = settings::load_or_default(&app)?;
    s.fnn_binary_path = path_str.clone();
    settings::save(&app, &s)?;
    Ok(path_str)
}

#[tauri::command]
pub fn download_pinned_fnn(app: tauri::AppHandle) -> Result<String, String> {
    let path = fnn_fetch::download_and_install(&app)?;
    let path_str = path.to_string_lossy().into_owned();
    let mut s = settings::load_or_default(&app)?;
    s.fnn_binary_path = path_str.clone();
    settings::save(&app, &s)?;
    Ok(path_str)
}

#[tauri::command]
pub fn install_upstream_fnn_config(app: tauri::AppHandle) -> Result<(), String> {
    let s = settings::load_or_default(&app)?;
    let url = s.ckb_rpc_url.trim();
    if url.is_empty() {
        return Err("CKB RPC URL is empty; set it in Settings first.".to_string());
    }
    config_sync::install_upstream_config(s.network, Path::new(&s.fnn_config_path), Some(url))
}

#[tauri::command]
pub fn apply_ckb_rpc_to_config_file(app: tauri::AppHandle) -> Result<(), String> {
    let s = settings::load_or_default(&app)?;
    let url = s.ckb_rpc_url.trim();
    if url.is_empty() {
        return Err("CKB RPC URL is empty.".to_string());
    }
    config_sync::read_and_patch_config(Path::new(&s.fnn_config_path), url)
}

/// Sets `fiber.bootnode_addrs` to `[]` in the configured `config.yml` so fnn does not
/// auto-dial upstream public relays. Restart fnn to apply.
#[tauri::command]
pub fn clear_config_bootnodes(app: tauri::AppHandle) -> Result<(), String> {
    let s = settings::load_or_default(&app)?;
    config_sync::clear_bootnodes_in_config_file(Path::new(&s.fnn_config_path))
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    settings::load_or_default(&app)
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, mut settings: AppSettings) -> Result<(), String> {
    settings::normalize_app_settings(&app, &mut settings)?;
    settings.apply_network_defaults();
    settings::save(&app, &settings)
}

#[tauri::command]
pub fn set_fnn_secret_password(password: String) -> Result<(), String> {
    if password.is_empty() {
        return Err("password must not be empty".to_string());
    }
    secret::set_fnn_secret_password(&password)
}

#[tauri::command]
pub fn has_fnn_secret_password() -> Result<bool, String> {
    secret::has_fnn_secret_password()
}

#[tauri::command]
pub fn fnn_start(app: tauri::AppHandle, runtime: tauri::State<FnnRuntime>) -> Result<u32, String> {
    let settings = settings::load_or_default(&app)?;
    fnn_precheck::check_ckb_node_key_ready(&settings.fnn_data_dir)?;
    let password = secret::get_fnn_secret_password()?.ok_or_else(|| {
        "No FNN key password in OS keychain. Save one under Security first.".to_string()
    })?;
    let pid = runtime.start(
        &app,
        &settings.fnn_binary_path,
        &settings.fnn_config_path,
        &settings.fnn_data_dir,
        &password,
    )?;
    let pid_file = fnn_pid_file(&settings.fnn_data_dir);
    let _ = std::fs::write(&pid_file, pid.to_string());
    runtime.remember_pid_file(pid_file);
    Ok(pid)
}

#[tauri::command]
pub fn fnn_stop(app: tauri::AppHandle, runtime: tauri::State<FnnRuntime>) -> Result<(), String> {
    let remembered_pid_file = runtime.take_pid_file();
    let settings_pid_file = settings::load_or_default(&app)
        .ok()
        .map(|settings| fnn_pid_file(&settings.fnn_data_dir));
    let result = runtime.stop();
    remove_pid_files(remembered_pid_file.into_iter().chain(settings_pid_file));
    result
}

/// Called once on app startup. Reads the saved PID file and, if the process is
/// still alive, adopts it so the UI shows the correct "running" state instead of
/// prompting the user to start a node that is already running.
#[tauri::command]
pub fn fnn_adopt_orphan(app: tauri::AppHandle, runtime: tauri::State<FnnRuntime>) -> bool {
    let settings = match settings::load_or_default(&app) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let pid_file = fnn_pid_file(&settings.fnn_data_dir);
    let pid_str = match std::fs::read_to_string(&pid_file) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let pid: u32 = match pid_str.trim().parse() {
        Ok(p) => p,
        Err(_) => {
            let _ = std::fs::remove_file(&pid_file);
            return false;
        }
    };
    if runtime.adopt(pid) {
        runtime.remember_pid_file(pid_file);
        true
    } else {
        // Stale PID file – process is no longer alive.
        let _ = std::fs::remove_file(&pid_file);
        false
    }
}

#[tauri::command]
pub fn fnn_status(runtime: tauri::State<FnnRuntime>) -> crate::fnn_runtime::FnnStatusPayload {
    runtime.status_payload()
}

#[tauri::command]
pub fn fnn_logs(runtime: tauri::State<FnnRuntime>, max_lines: Option<usize>) -> Vec<String> {
    runtime.logs_tail(max_lines.unwrap_or(400))
}

#[tauri::command]
pub fn fnn_runtime_snapshot(
    runtime: tauri::State<FnnRuntime>,
    max_log_lines: Option<usize>,
) -> FnnRuntimeSnapshot {
    runtime.runtime_snapshot(max_log_lines.unwrap_or(0))
}

#[tauri::command]
pub fn get_platform_labels() -> crate::platform::PlatformLabels {
    crate::platform::platform_labels()
}

#[tauri::command]
pub fn fiber_rpc_call(
    app: tauri::AppHandle,
    method: String,
    params: Value,
) -> Result<Value, String> {
    let settings = settings::load_or_default(&app)?;
    let url = settings.fnn_rpc_url.trim().to_string();
    if url.is_empty() {
        return Err("FNN RPC URL is empty; set it in Settings.".to_string());
    }
    fiber_rpc::call(&url, &method, params)
}
