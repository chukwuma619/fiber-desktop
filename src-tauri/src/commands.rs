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
}

#[tauri::command]
pub fn fnn_binary_status(app: tauri::AppHandle) -> Result<FnnBinaryStatus, String> {
    let settings = settings::load_or_default(&app)?;
    let bundled = bundled_fnn::bundled_executable_path(&app);
    let bundled_available = bundled.is_some();
    let bundled_path = bundled.as_ref().map(|p| p.to_string_lossy().into_owned());
    let active = Path::new(&settings.fnn_binary_path);
    let is_bundled = bundled_fnn::is_active_path_bundled(&app, active);
    Ok(FnnBinaryStatus {
        pinned_tag: fnn_fetch::PINNED_FNN_TAG.to_string(),
        bundled_path,
        is_bundled,
        bundled_available,
        active_path: settings.fnn_binary_path,
    })
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
