use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Network {
    Mainnet,
    Testnet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub network: Network,
    pub ckb_rpc_url: String,
    /// Absolute path: FNN `-d` data directory
    pub fnn_data_dir: String,
    /// Absolute path: FNN `-c` config.yml
    pub fnn_config_path: String,
    /// Absolute path: fnn binary (or sidecar name once bundled)
    pub fnn_binary_path: String,
    /// JSON-RPC base URL, e.g. http://127.0.0.1:8227
    pub fnn_rpc_url: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            network: Network::Testnet,
            ckb_rpc_url: "https://testnet.ckbapp.dev/".to_string(),
            fnn_data_dir: String::new(),
            fnn_config_path: String::new(),
            fnn_binary_path: String::new(),
            fnn_rpc_url: "http://127.0.0.1:8227".to_string(),
        }
    }
}

impl AppSettings {
    pub fn apply_network_defaults(&mut self) {
        match self.network {
            Network::Mainnet => {
                if self.ckb_rpc_url.contains("testnet") {
                    self.ckb_rpc_url = "https://mainnet.ckbapp.dev/".to_string();
                }
            }
            Network::Testnet => {
                if self.ckb_rpc_url.contains("mainnet") && !self.ckb_rpc_url.contains("testnet") {
                    self.ckb_rpc_url = "https://testnet.ckbapp.dev/".to_string();
                }
            }
        }
    }
}

/// All app-writable state lives under `~/.fiber_desktop` (macOS/Linux) or `%USERPROFILE%\.fiber_desktop` (Windows).
pub fn fiber_desktop_root() -> Result<PathBuf, String> {
    let home = home_dir().ok_or_else(|| "could not resolve home directory".to_string())?;
    Ok(home.join(".fiber_desktop"))
}

pub fn settings_path() -> Result<PathBuf, String> {
    Ok(fiber_desktop_root()?.join("settings.json"))
}

fn default_fnn_data_dir() -> Result<String, String> {
    Ok(fiber_desktop_root()?
        .join("fnn-data")
        .to_string_lossy()
        .into_owned())
}

fn home_dir() -> Option<PathBuf> {
    #[cfg(windows)]
    {
        std::env::var_os("USERPROFILE").map(PathBuf::from)
    }
    #[cfg(not(windows))]
    {
        std::env::var_os("HOME").map(PathBuf::from)
    }
}

fn expand_tilde(path: &str) -> String {
    let p = path.trim();
    if let Some(rest) = p.strip_prefix("~/") {
        if let Some(h) = home_dir() {
            return h.join(rest).to_string_lossy().into_owned();
        }
    }
    p.to_string()
}

fn dir_missing_or_empty(dir: &Path) -> bool {
    if !dir.exists() {
        return true;
    }
    if !dir.is_dir() {
        return false;
    }
    std::fs::read_dir(dir)
        .map(|mut it| it.next().is_none())
        .unwrap_or(true)
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if !src.is_dir() {
        return Ok(());
    }
    std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else if file_type.is_file() {
            std::fs::copy(&from, &to).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// If the new layout has no settings yet but Tauri’s legacy `app_data_dir` does, copy `settings.json`
/// and optionally `fnn-data` / `tools` into `~/.fiber_desktop` once.
fn migrate_legacy_storage_from_app_data(app: &tauri::AppHandle) -> Result<(), String> {
    let new_root = fiber_desktop_root()?;
    let new_settings = new_root.join("settings.json");
    if new_settings.exists() {
        return Ok(());
    }

    let legacy_root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let legacy_settings = legacy_root.join("settings.json");
    if !legacy_settings.is_file() {
        return Ok(());
    }

    std::fs::create_dir_all(&new_root).map_err(|e| e.to_string())?;
    std::fs::copy(&legacy_settings, &new_settings).map_err(|e| e.to_string())?;

    let legacy_data = legacy_root.join("fnn-data");
    let new_data = new_root.join("fnn-data");
    if legacy_data.is_dir() && dir_missing_or_empty(&new_data) {
        copy_dir_recursive(&legacy_data, &new_data)?;
    }

    let legacy_tools = legacy_root.join("tools");
    let new_tools = new_root.join("tools");
    if legacy_tools.is_dir() && dir_missing_or_empty(&new_tools) {
        copy_dir_recursive(&legacy_tools, &new_tools)?;
    }

    Ok(())
}

/// Trim, expand `~`, resolve relative paths against stable roots, and apply defaults.
/// Relative **data** paths are resolved under `~/.fiber_desktop`; relative **config**
/// paths are resolved under the data directory so `config.yml` lands beside node data.
pub fn normalize_app_settings(
    _app: &tauri::AppHandle,
    settings: &mut AppSettings,
) -> Result<(), String> {
    settings.ckb_rpc_url = settings.ckb_rpc_url.trim().to_string();
    settings.fnn_rpc_url = settings.fnn_rpc_url.trim().to_string();

    settings.fnn_data_dir = expand_tilde(&settings.fnn_data_dir);
    settings.fnn_config_path = expand_tilde(&settings.fnn_config_path);
    settings.fnn_binary_path = expand_tilde(&settings.fnn_binary_path);

    let root = fiber_desktop_root()?;

    if settings.fnn_data_dir.is_empty() {
        settings.fnn_data_dir = default_fnn_data_dir()?;
    } else if !Path::new(&settings.fnn_data_dir).is_absolute() {
        settings.fnn_data_dir = root
            .join(&settings.fnn_data_dir)
            .to_string_lossy()
            .into_owned();
    }

    let data_root = PathBuf::from(&settings.fnn_data_dir);
    if settings.fnn_config_path.is_empty() {
        settings.fnn_config_path = data_root.join("config.yml").to_string_lossy().into_owned();
    } else if !Path::new(&settings.fnn_config_path).is_absolute() {
        settings.fnn_config_path = data_root
            .join(&settings.fnn_config_path)
            .to_string_lossy()
            .into_owned();
    }

    if !settings.fnn_binary_path.is_empty() && !Path::new(&settings.fnn_binary_path).is_absolute() {
        settings.fnn_binary_path = root
            .join(&settings.fnn_binary_path)
            .to_string_lossy()
            .into_owned();
    }

    Ok(())
}

/// Ensures default layout exists on disk as soon as settings are loaded (before save or guided setup).
/// Creates the data directory, `ckb/` for the wallet key file, and the config file parent directory.
pub fn ensure_fnn_storage_exists(settings: &AppSettings) -> Result<(), String> {
    let data = Path::new(&settings.fnn_data_dir);
    std::fs::create_dir_all(data).map_err(|e| {
        format!(
            "could not create Fiber data folder at {}: {e}",
            data.display()
        )
    })?;
    std::fs::create_dir_all(data.join("ckb")).map_err(|e| {
        format!(
            "could not create CKB key folder at {}: {e}",
            data.join("ckb").display()
        )
    })?;
    if let Some(parent) = Path::new(&settings.fnn_config_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            format!(
                "could not create folder for config file {}: {e}",
                settings.fnn_config_path
            )
        })?;
    }
    Ok(())
}

pub fn load_or_default(app: &tauri::AppHandle) -> Result<AppSettings, String> {
    migrate_legacy_storage_from_app_data(app)?;

    let path = settings_path()?;
    let mut settings = if path.exists() {
        let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).map_err(|e| e.to_string())?
    } else {
        AppSettings::default()
    };

    normalize_app_settings(app, &mut settings)?;
    ensure_fnn_storage_exists(&settings)?;

    if let Some(p) = crate::bundled_fnn::resolve_fnn_binary_path(app, &settings.fnn_binary_path) {
        settings.fnn_binary_path = p;
    }

    Ok(settings)
}

pub fn save(_app: &tauri::AppHandle, settings: &AppSettings) -> Result<(), String> {
    std::fs::create_dir_all(Path::new(&settings.fnn_data_dir)).map_err(|e| e.to_string())?;

    let path = settings_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(path, raw).map_err(|e| e.to_string())
}
