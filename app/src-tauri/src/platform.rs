use serde::Serialize;

/// UI strings and hints that depend on the host OS (Tauri desktop: macOS, Windows, Linux).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformLabels {
    /// `macos` | `windows` | `linux` | value from `std::env::consts::OS` for other targets
    pub os: String,
    pub secret_storage_name: String,
    pub save_password_label: String,
    pub checking_password_label: String,
    /// Shown when duplicate fnn / data-dir lock (Node tab).
    pub terminal_hint: String,
    /// Shown when `openPath` fails (CKB key folder).
    pub file_manager_name: String,
}

pub fn platform_labels() -> PlatformLabels {
    #[cfg(target_os = "windows")]
    {
        PlatformLabels {
            os: "windows".to_string(),
            secret_storage_name: "Windows Credential Manager".to_string(),
            save_password_label: "Save to Credential Manager".to_string(),
            checking_password_label: "Checking Credential Manager…".to_string(),
            terminal_hint: "PowerShell, Command Prompt, or Git Bash window running ".to_string(),
            file_manager_name: "File Explorer".to_string(),
        }
    }
    #[cfg(target_os = "macos")]
    {
        PlatformLabels {
            os: "macos".to_string(),
            secret_storage_name: "macOS Keychain".to_string(),
            save_password_label: "Save to Keychain".to_string(),
            checking_password_label: "Checking Keychain…".to_string(),
            terminal_hint: "Terminal window running ".to_string(),
            file_manager_name: "Finder".to_string(),
        }
    }
    #[cfg(target_os = "linux")]
    {
        PlatformLabels {
            os: "linux".to_string(),
            secret_storage_name: "Secret Service (system keyring)".to_string(),
            save_password_label: "Save to keyring".to_string(),
            checking_password_label: "Checking keyring…".to_string(),
            terminal_hint: "terminal window running ".to_string(),
            file_manager_name: "your file manager".to_string(),
        }
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        PlatformLabels {
            os: std::env::consts::OS.to_string(),
            secret_storage_name: "system secure storage".to_string(),
            save_password_label: "Save password".to_string(),
            checking_password_label: "Checking secure storage…".to_string(),
            terminal_hint: "terminal running ".to_string(),
            file_manager_name: "your file manager".to_string(),
        }
    }
}
