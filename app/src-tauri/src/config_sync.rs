//! Fetch default `config.yml` from Fiber repo and patch `ckb.rpc_url`.

use crate::fnn_fetch::PINNED_FNN_TAG;
use crate::settings::Network;
use std::path::Path;

pub fn upstream_config_url(network: Network) -> String {
    let tail = match network {
        Network::Mainnet => "mainnet/config.yml",
        Network::Testnet => "testnet/config.yml",
    };
    format!("https://raw.githubusercontent.com/nervosnetwork/fiber/{PINNED_FNN_TAG}/config/{tail}")
}

pub fn fetch_upstream_config_yaml(network: Network) -> Result<String, String> {
    let url = upstream_config_url(network);
    ureq::get(&url)
        .call()
        .map_err(|e| format!("fetch config template: {e}"))
        .and_then(|r| r.into_string().map_err(|e| e.to_string()))
}

/// Replace the first `rpc_url:` inside the top-level `ckb:` mapping.
pub fn patch_ckb_rpc_url(content: &str, new_url: &str) -> Result<String, String> {
    let new_url_esc = new_url.replace('\\', "\\\\").replace('"', "\\\"");
    let mut result: Vec<String> = Vec::new();
    let mut in_ckb = false;
    let mut ckb_col = 0usize;
    let mut replaced = false;

    for line in content.lines() {
        let trimmed = line.trim_start();
        let indent = line.len().saturating_sub(trimmed.len());

        if !in_ckb {
            if trimmed == "ckb:" {
                in_ckb = true;
                ckb_col = indent;
                result.push(line.into());
                continue;
            }
            result.push(line.into());
            continue;
        }

        if trimmed.is_empty() {
            result.push(line.into());
            continue;
        }
        if indent <= ckb_col {
            in_ckb = false;
            result.push(line.into());
            continue;
        }
        if trimmed.starts_with("rpc_url:") {
            let prefix = &line[..indent];
            result.push(format!("{}rpc_url: \"{}\"", prefix, new_url_esc));
            replaced = true;
            continue;
        }
        result.push(line.into());
    }

    if !replaced {
        return Err(
            "No rpc_url line found under top-level ckb: block. Use a standard Fiber config.yml."
                .into(),
        );
    }

    let mut out = result.join("\n");
    if content.ends_with('\n') {
        out.push('\n');
    }
    Ok(out)
}

pub fn write_config(path: &Path, yaml: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(path, yaml).map_err(|e| e.to_string())
}

pub fn install_upstream_config(
    network: Network,
    dest: &Path,
    rpc_url_override: Option<&str>,
) -> Result<(), String> {
    let mut yaml = fetch_upstream_config_yaml(network)?;
    if let Some(url) = rpc_url_override {
        yaml = patch_ckb_rpc_url(&yaml, url)?;
    }
    write_config(dest, &yaml)
}

pub fn read_and_patch_config(config_path: &Path, new_rpc_url: &str) -> Result<(), String> {
    let raw = std::fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    let next = patch_ckb_rpc_url(&raw, new_rpc_url)?;
    write_config(config_path, &next)
}
