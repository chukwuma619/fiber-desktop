//! Checks required files before spawning fnn (matches fiber-lib CKB key layout).

use std::path::{Path, PathBuf};

/// Default relative to FNN `-d` data dir: `{data_dir}/ckb/key` (see fiber `CkbConfig::read_secret_key`).
pub fn ckb_node_key_path(data_dir: &str) -> PathBuf {
    Path::new(data_dir).join("ckb").join("key")
}

pub fn check_ckb_node_key_ready(data_dir: &str) -> Result<(), String> {
    let key_path = ckb_node_key_path(data_dir);
    let ckb_dir = key_path
        .parent()
        .ok_or_else(|| "invalid ckb key path".to_string())?;
    std::fs::create_dir_all(ckb_dir).map_err(|e| format!("could not create ckb data dir: {e}"))?;
    if !key_path.is_file() {
        return Err(format!(
            "Missing CKB private key file at {}.\n\n\
Fiber (fnn) needs a one-line secp256k1 private key (hex) at that path—usually from `ckb-cli account export`. \
The app password only encrypts this file; it does not create the key.\n\n\
Step-by-step: https://github.com/nervosnetwork/fiber/blob/develop/docs/public-nodes.md",
            key_path.display()
        ));
    }
    let len = std::fs::metadata(&key_path)
        .map(|m| m.len())
        .map_err(|e| format!("cannot read key file metadata: {e}"))?;
    if len == 0 {
        return Err(format!(
            "CKB key file at {} is empty. Add a valid private key (one line of hex) or remove the file.",
            key_path.display()
        ));
    }
    Ok(())
}
