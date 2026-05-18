//! Fetch default `config.yml` from Fiber repo and patch `ckb.rpc_url`.
//! Optionally strip `bootnode_addrs` so the node does not auto-dial public relays.

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

/// Replace `bootnode_addrs:` and any following list entries with `bootnode_addrs: []`.
/// Leaves the file unchanged if the key is missing or already set to an inline `[]`.
pub fn patch_clear_bootnode_addrs(content: &str) -> String {
    let lines: Vec<&str> = content.lines().collect();
    let mut out: Vec<String> = Vec::new();
    let mut i = 0usize;
    while i < lines.len() {
        let line = lines[i];
        let trimmed = line.trim_start();
        if let Some(rest) = trimmed.strip_prefix("bootnode_addrs:") {
            let after = rest.trim();
            if after.starts_with('[') {
                out.push(line.to_string());
                i += 1;
                continue;
            }
            let key_indent = line.len() - trimmed.len();
            let prefix = &line[..key_indent];
            out.push(format!("{prefix}bootnode_addrs: []"));
            i += 1;
            while i < lines.len() {
                let l = lines[i];
                if l.trim().is_empty() {
                    i += 1;
                    continue;
                }
                let ind = l.len() - l.trim_start().len();
                let t = l.trim_start();
                if ind > key_indent || (ind == key_indent && t.starts_with('-')) {
                    i += 1;
                    continue;
                }
                break;
            }
            continue;
        }
        out.push(line.to_string());
        i += 1;
    }
    let mut s = out.join("\n");
    if content.ends_with('\n') {
        s.push('\n');
    }
    s
}

/// Clears `fiber.bootnode_addrs` in an existing config file (no-op if absent / already empty).
pub fn clear_bootnodes_in_config_file(path: &Path) -> Result<(), String> {
    let raw = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let next = patch_clear_bootnode_addrs(&raw);
    write_config(path, &next)
}

pub fn install_upstream_config(
    network: Network,
    dest: &Path,
    rpc_url_override: Option<&str>,
) -> Result<(), String> {
    let mut yaml = fetch_upstream_config_yaml(network)?;
    yaml = patch_clear_bootnode_addrs(&yaml);
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

#[cfg(test)]
mod tests {
    use super::patch_clear_bootnode_addrs;

    #[test]
    fn clears_bootnode_list_like_upstream_template() {
        let yaml = r#"fiber:
 listening_addr: "/ip4/0.0.0.0/tcp/8228"
 bootnode_addrs:
 - "/ip4/54.179.226.154/tcp/8228/p2p/Qmes1EBD4yNo9Ywkfe6eRw9tG1nVNGLDmMud1xJMsoYFKy"
 - "/ip4/16.163.7.105/tcp/8228/p2p/QmdyQWjPtbK4NWWsvy8s69NGJaQULwgeQDT5ZpNDrTNaeV"
 announce_listening_addr: true
"#;
        let out = patch_clear_bootnode_addrs(yaml);
        assert!(out.contains("bootnode_addrs: []"));
        assert!(!out.contains("54.179.226.154"));
        assert!(out.contains("announce_listening_addr: true"));
    }

    #[test]
    fn leaves_inline_empty_bootnodes() {
        let yaml = "fiber:\n bootnode_addrs: []\n announce: true\n";
        let out = patch_clear_bootnode_addrs(yaml);
        assert_eq!(out, yaml);
    }
}
