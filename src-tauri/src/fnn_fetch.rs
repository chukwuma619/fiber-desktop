//! Download and extract the pinned fnn release from GitHub (matches EXECUTION_PLAN).

use flate2::read::GzDecoder;
use std::fs::File;
use std::path::{Path, PathBuf};
use tar::Archive;

/// Pinned tag; bump with Fiber breaking RPC changes.
pub const PINNED_FNN_TAG: &str = "v0.8.1";
const REPO_RELEASE_BASE: &str = "https://github.com/nervosnetwork/fiber/releases/download";

pub struct PinnedFnnMeta {
    pub tag: &'static str,
    pub asset_file_name: String,
    pub download_url: String,
}

pub fn pinned_fnn_metadata() -> Result<PinnedFnnMeta, String> {
    let asset = github_asset_file_name()?;
    let url = format!("{REPO_RELEASE_BASE}/{PINNED_FNN_TAG}/{asset}");
    Ok(PinnedFnnMeta {
        tag: PINNED_FNN_TAG,
        asset_file_name: asset,
        download_url: url,
    })
}

fn github_asset_file_name() -> Result<String, String> {
    let arch = if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else if cfg!(target_arch = "x86_64") {
        "x86_64"
    } else {
        return Err(format!(
            "unsupported arch {} for bundled fnn download",
            std::env::consts::ARCH
        ));
    };

    let file = if cfg!(target_os = "macos") {
        format!("fnn_{PINNED_FNN_TAG}-{arch}-darwin-portable.tar.gz")
    } else if cfg!(target_os = "linux") {
        format!("fnn_{PINNED_FNN_TAG}-{arch}-linux-portable.tar.gz")
    } else if cfg!(target_os = "windows") {
        if arch != "x86_64" {
            return Err("fnn Windows builds are x86_64 only".to_string());
        }
        format!("fnn_{PINNED_FNN_TAG}-x86_64-windows.tar.gz")
    } else {
        return Err(format!(
            "unsupported OS {} for fnn download",
            std::env::consts::OS
        ));
    };
    Ok(file)
}

fn tools_dir() -> Result<PathBuf, String> {
    Ok(crate::settings::fiber_desktop_root()?
        .join("tools")
        .join(PINNED_FNN_TAG.trim_start_matches('v')))
}

pub fn download_and_install(_app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let meta = pinned_fnn_metadata()?;
    let out_root = tools_dir()?;
    let strip = PINNED_FNN_TAG.trim_start_matches('v');
    let expected_bin = out_root.join(if cfg!(windows) {
        format!("fnn-{strip}/fnn.exe")
    } else {
        format!("fnn-{strip}/fnn")
    });

    if expected_bin.exists() {
        return Ok(expected_bin);
    }

    std::fs::create_dir_all(&out_root).map_err(|e| e.to_string())?;

    let tmp_gz = out_root.join(&meta.asset_file_name);
    let mut reader = ureq::get(&meta.download_url)
        .call()
        .map_err(|e| format!("download failed: {e}"))?
        .into_reader();
    let mut f = File::create(&tmp_gz).map_err(|e| e.to_string())?;
    std::io::copy(&mut reader, &mut f).map_err(|e| format!("write archive: {e}"))?;
    drop(f);

    let extract_dir = out_root.join(format!("extract-{}", std::process::id()));
    if extract_dir.exists() {
        std::fs::remove_dir_all(&extract_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

    let file = File::open(&tmp_gz).map_err(|e| e.to_string())?;
    let dec = GzDecoder::new(file);
    let mut archive = Archive::new(dec);
    archive
        .unpack(&extract_dir)
        .map_err(|e| format!("extract tar.gz: {e}"))?;

    let fnn_path = find_fnn_executable(&extract_dir).ok_or_else(|| {
        "archive did not contain fnn (or fnn.exe); check Fiber release layout".to_string()
    })?;

    let dest_dir = out_root.join(format!("fnn-{strip}"));
    if dest_dir.exists() {
        std::fs::remove_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let dest = dest_dir.join(
        fnn_path
            .file_name()
            .ok_or_else(|| "invalid fnn path".to_string())?,
    );
    std::fs::copy(&fnn_path, &dest).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&dest)
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&dest, perms).map_err(|e| e.to_string())?;
    }

    let _ = std::fs::remove_dir_all(&extract_dir);
    let _ = std::fs::remove_file(&tmp_gz);

    Ok(dest)
}

fn find_fnn_executable(dir: &Path) -> Option<PathBuf> {
    let want = if cfg!(windows) { "fnn.exe" } else { "fnn" };
    let mut stack = vec![dir.to_path_buf()];
    while let Some(p) = stack.pop() {
        let read = std::fs::read_dir(&p).ok()?;
        for e in read.flatten() {
            let path = e.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.file_name().and_then(|n| n.to_str()) == Some(want) {
                return Some(path);
            }
        }
    }
    None
}
