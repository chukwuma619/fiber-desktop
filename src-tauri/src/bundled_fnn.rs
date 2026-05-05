//! Resolve the `fnn` executable bundled via Tauri `bundle.externalBin` (sidecar).
//! See https://v2.tauri.app/develop/sidecar/

use std::path::{Path, PathBuf};
use tauri::Manager;

fn sidecar_file_name() -> String {
    let triple = env!("FIBER_DESKTOP_TARGET_TRIPLE");
    if cfg!(windows) {
        format!("fnn-{triple}.exe")
    } else {
        format!("fnn-{triple}")
    }
}

pub fn bundled_executable_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    let name = sidecar_file_name();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let p = parent.join(&name);
            if p.is_file() {
                return Some(p);
            }
        }
    }

    if let Ok(dir) = app.path().resource_dir() {
        let p = dir.join(&name);
        if p.is_file() {
            return Some(p);
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
