use serde::{Deserialize, Serialize};
use std::path::PathBuf;
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

pub fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

fn default_fnn_data_dir(app: &tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("fnn-data");
    Ok(dir.to_string_lossy().into_owned())
}

pub fn load_or_default(app: &tauri::AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(app)?;
    let mut settings = if path.exists() {
        let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw).map_err(|e| e.to_string())?
    } else {
        AppSettings::default()
    };

    if settings.fnn_data_dir.is_empty() {
        settings.fnn_data_dir = default_fnn_data_dir(app)?;
    }
    if settings.fnn_config_path.is_empty() {
        settings.fnn_config_path = PathBuf::from(&settings.fnn_data_dir)
            .join("config.yml")
            .to_string_lossy()
            .into_owned();
    }

    if settings.fnn_binary_path.is_empty() {
        if let Some(p) = crate::bundled_fnn::bundled_executable_path(app) {
            settings.fnn_binary_path = p.to_string_lossy().into_owned();
        }
    }

    Ok(settings)
}

pub fn save(app: &tauri::AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(path, raw).map_err(|e| e.to_string())
}
