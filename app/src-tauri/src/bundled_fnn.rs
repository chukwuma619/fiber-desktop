//! Resolve the `fnn` executable bundled via Tauri `bundle.externalBin` (sidecar).
//! See https://v2.tauri.app/develop/sidecar/

use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// How the active `fnn` path was chosen (for UI labels).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FnnBinarySource {
    Bundled,
    Downloaded,
    Custom,
    Unavailable,
}

impl FnnBinarySource {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Bundled => "bundled",
            Self::Downloaded => "downloaded",
            Self::Custom => "custom",
            Self::Unavailable => "unavailable",
        }
    }
}

fn target_triple_sidecar_file_name() -> String {
    let triple = env!("FIBER_DESKTOP_TARGET_TRIPLE");
    if cfg!(windows) {
        format!("fnn-{triple}.exe")
    } else {
        format!("fnn-{triple}")
    }
}

pub fn bundled_executable_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    let names = [
        fnn_exe_name().to_string(),
        target_triple_sidecar_file_name(),
    ];

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            for name in &names {
                let p = parent.join(name);
                if p.is_file() {
                    return Some(p);
                }
            }
        }
    }

    if let Ok(dir) = app.path().resource_dir() {
        for name in &names {
            let p = dir.join(name);
            if p.is_file() {
                return Some(p);
            }
        }
    }

    None
}

pub fn is_active_path_bundled(app: &tauri::AppHandle, active: &Path) -> bool {
    let Some(b) = bundled_executable_path(app) else {
        return false;
    };
    paths_refer_to_same_file(active, &b)
}

fn paths_refer_to_same_file(a: &Path, b: &Path) -> bool {
    if a == b {
        return true;
    }
    if a.as_os_str().is_empty() || b.as_os_str().is_empty() {
        return false;
    }
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(ca), Ok(cb)) => ca == cb,
        _ => false,
    }
}

#[cfg(windows)]
fn fnn_exe_name() -> &'static str {
    "fnn.exe"
}

#[cfg(not(windows))]
fn fnn_exe_name() -> &'static str {
    "fnn"
}

fn find_on_path(name: &str) -> Option<PathBuf> {
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths).find_map(|dir| {
            let candidate = dir.join(name);
            candidate.is_file().then_some(candidate)
        })
    })
}

fn tools_install_dir(app: &AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    Some(
        dir.join("tools")
            .join(crate::fnn_fetch::PINNED_FNN_TAG.trim_start_matches('v')),
    )
}

fn path_under_dir(path: &Path, dir: &Path) -> bool {
    match (path.canonicalize(), dir.canonicalize()) {
        (Ok(p), Ok(d)) => p.starts_with(&d),
        _ => path.starts_with(dir),
    }
}

pub fn classify_binary_source(app: &AppHandle, active: &Path) -> FnnBinarySource {
    if !active.is_file() {
        return FnnBinarySource::Unavailable;
    }
    if is_active_path_bundled(app, active) {
        return FnnBinarySource::Bundled;
    }
    if tools_install_dir(app)
        .is_some_and(|dir| path_under_dir(active, &dir))
    {
        return FnnBinarySource::Downloaded;
    }
    FnnBinarySource::Custom
}

/// Prefer an existing configured path, else bundled sidecar, else `fnn` on `PATH` (Homebrew, etc.).
pub fn resolve_fnn_binary_path(app: &AppHandle, configured: &str) -> Option<String> {
    let c = configured.trim();
    if !c.is_empty() && Path::new(c).is_file() {
        return Some(c.to_string());
    }
    if let Some(p) = bundled_executable_path(app) {
        if p.is_file() {
            return Some(p.to_string_lossy().into_owned());
        }
    }
    find_on_path(fnn_exe_name()).map(|p| p.to_string_lossy().into_owned())
}

/// Returns `true` when settings were updated and should be saved.
pub fn apply_resolved_binary_path(app: &AppHandle, configured: &mut String) -> bool {
    let previous = configured.clone();
    let Some(resolved) = resolve_fnn_binary_path(app, configured) else {
        return false;
    };
    let should_replace = previous.trim().is_empty() || !Path::new(previous.trim()).is_file();
    if should_replace && previous != resolved {
        *configured = resolved;
        return true;
    }
    false
}
