use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformLabels {
    pub os: &'static str,
    pub secret_storage_name: String,
    pub save_password_label: String,
    pub checking_password_label: String,
}

pub fn platform_labels() -> PlatformLabels {
    #[cfg(target_os = "windows")]
    {
        PlatformLabels {
            os: "windows",
            secret_storage_name: "Windows Credential Manager".to_string(),
            save_password_label: "Save to Credential Manager".to_string(),
            checking_password_label: "Checking Credential Manager…".to_string(),
        }
    }
    #[cfg(target_os = "macos")]
    {
        PlatformLabels {
            os: "macos",
            secret_storage_name: "macOS Keychain".to_string(),
            save_password_label: "Save to Keychain".to_string(),
            checking_password_label: "Checking Keychain…".to_string(),
        }
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        PlatformLabels {
            os: "linux",
            secret_storage_name: "system keyring".to_string(),
            save_password_label: "Save to keyring".to_string(),
            checking_password_label: "Checking keyring…".to_string(),
        }
    }
}
