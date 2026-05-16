use crate::bundled_fnn;
use crate::config_sync;
use crate::fiber_rpc;
use crate::fnn_fetch;
use crate::fnn_precheck;
use crate::fnn_runtime::FnnRuntime;
use crate::secret;
use crate::settings::{self, AppSettings};
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

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
}

#[tauri::command]
pub fn fnn_binary_status(app: tauri::AppHandle) -> Result<FnnBinaryStatus, String> {
    let settings = settings::load_or_default(&app)?;
    let bundled = bundled_fnn::bundled_executable_path(&app);
    let bundled_available = bundled.is_some();
    let bundled_path = bundled.as_ref().map(|p| p.to_string_lossy().into_owned());
    let active = Path::new(&settings.fnn_binary_path);
    let is_bundled = bundled_fnn::is_active_path_bundled(&app, active);
    let executable_ready = !settings.fnn_binary_path.trim().is_empty() && active.is_file();
    Ok(FnnBinaryStatus {
        pinned_tag: fnn_fetch::PINNED_FNN_TAG.to_string(),
        bundled_path,
        is_bundled,
        bundled_available,
        active_path: settings.fnn_binary_path,
        executable_ready,
    })
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
    runtime.start(
        &settings.fnn_binary_path,
        &settings.fnn_config_path,
        &settings.fnn_data_dir,
        &password,
    )
}

#[tauri::command]
pub fn fnn_stop(runtime: tauri::State<FnnRuntime>) -> Result<(), String> {
    runtime.stop()
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
